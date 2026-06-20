import re

filepath = 'c:/Users/jagl_/AntigravityWorkspace/pump-scanner/backend/scanner.py'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update run_scan_cycle prioritization
scan_cycle_pattern = r'''        all_results = \[\]
        scan_jobs = \[\]
        for ex_name, symbols in self\.monitored_pairs\.items\(\):
            pairs_to_scan = symbols\[:int\(self\.settings\["max_pairs"\]\)\]
            self\.log\(f"Scanning top \{len\(pairs_to_scan\)\} pairs on \{ex_name\.upper\(\)\}\.\.\."\)
            scan_jobs\.extend\(\(ex_name, symbol\) for symbol in pairs_to_scan\)'''
scan_cycle_replacement = r'''        all_results = []
        scan_jobs = []
        
        # Phase 4: Symbol Prioritization
        # Collect all candidates first to prioritize them
        high_priority = {c["symbol"] for c in self.accumulation_candidates}
        
        high_priority_jobs = []
        normal_priority_jobs = []
        
        for ex_name, symbols in self.monitored_pairs.items():
            pairs_to_scan = symbols[:int(self.settings.get("max_pairs", 300))]
            self.log(f"Sorting {len(pairs_to_scan)} pairs on {ex_name.upper()} into Priority Queues...")
            for symbol in pairs_to_scan:
                if symbol in high_priority:
                    high_priority_jobs.append((ex_name, symbol))
                else:
                    normal_priority_jobs.append((ex_name, symbol))
                    
        # Process high priority first
        scan_jobs.extend(high_priority_jobs)
        scan_jobs.extend(normal_priority_jobs)
        self.log(f"Queued {len(high_priority_jobs)} High Priority and {len(normal_priority_jobs)} Normal Priority jobs.")'''
content = re.sub(scan_cycle_pattern, scan_cycle_replacement, content)

# 2. Update handle_runtime_fault to implement adaptive backoff (Phase 11)
fault_backoff_pattern = r'''        if "429" in exc_str or "rate limit" in exc_str or "ddos" in exc_str:
            self\.log\("Rate limit saturation detected\. Activating Rate Limit Auto-Correction\.\.\.", level=logging\.WARNING\)
            self\.sequential_mode = True
            self\.log\("Slowing down queries: Switching from concurrent gather to sequential loop with 0\.5s jitter delay\.", level=logging\.WARNING\)
            await asyncio\.sleep\(120\)  # Cool down for 2 minutes
            return'''
fault_backoff_replacement = r'''        if "429" in exc_str or "rate limit" in exc_str or "ddos" in exc_str:
            self.log("Rate limit saturation detected. Activating Adaptive Backoff...", level=logging.WARNING)
            if self.concurrency_limit > 5:
                self.concurrency_limit = max(5, self.concurrency_limit - 5)
                self.scan_semaphore = asyncio.Semaphore(self.concurrency_limit)
                self.log(f"Reduced concurrency limit to {self.concurrency_limit}", level=logging.WARNING)
            await asyncio.sleep(5)  # Quick backoff pause
            return'''
content = re.sub(fault_backoff_pattern, fault_backoff_replacement, content)

# 3. Update scanner_main_loop to track cycle_duration properly
main_loop_sleep_pattern = r'''            elapsed = time\.time\(\) - start_time
            sleep_time = max\(1\.0, self\.settings\["interval_sec"\] - elapsed\)
            
            self\.log\(f"Scan cycle finished\. Sleeping for \{sleep_time:\.1f\} seconds\."\)'''
main_loop_sleep_replacement = r'''            cycle_duration = time.time() - start_time
            sleep_time = max(1.0, self.settings.get("interval_sec", 60) - cycle_duration)
            
            # Phase 11 Recovery: Slowly increase concurrency back to limit if stable
            target_limit = self.settings.get("scan_concurrency", 12)
            if self.concurrency_limit < target_limit:
                self.concurrency_limit = min(target_limit, self.concurrency_limit + 1)
                self.scan_semaphore = asyncio.Semaphore(self.concurrency_limit)
                self.log(f"Auto-recovery: Increased concurrency limit to {self.concurrency_limit}")
            
            self.log(f"Cycle completed in {cycle_duration:.2f}s. Sleeping for {sleep_time:.1f}s.")'''
content = re.sub(main_loop_sleep_pattern, main_loop_sleep_replacement, content)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print("File patched successfully: Prioritization and Adaptive Backoff.")
