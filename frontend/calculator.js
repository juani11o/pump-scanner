import { currentUser as commonUser, currentLang } from './common.js';

// CALCULATOR CODE
const presets = {
    stocks: { rate: 8.0, inflation: 3.0, frequency: 12 },
    crypto: { rate: 25.0, inflation: 3.0, frequency: 365 },
    realestate: { rate: 6.0, inflation: 3.0, frequency: 1 },
    savings: { rate: 4.0, inflation: 3.0, frequency: 12 },
    custom: { rate: 8.0, inflation: 3.0, frequency: 12 }
};

let compoundChartInstance = null;

    function initCompoundCalculator() {
        const principalInput = document.getElementById('principal');
        const principalSlider = document.getElementById('principalRange');
        const monthlyInput = document.getElementById('monthly');
        const monthlySlider = document.getElementById('monthlyRange');
        const rateInput = document.getElementById('rate');
        const rateSlider = document.getElementById('rateRange');
        const inflationInput = document.getElementById('inflation');
        const inflationSlider = document.getElementById('inflationRange');
        const freqSelect = document.getElementById('frequency');
        const yearsSlider = document.getElementById('yearsRange');
        const yearsLabel = document.getElementById('yearsLabel');
        const inspectYearSlider = document.getElementById('inspectYear');
        const inspectYearLabel = document.getElementById('inspectYearLabel');
        const btnCalc = document.getElementById('btnCalc');
        const tableToggle = document.getElementById('tableToggle');
        const tableWrap = document.getElementById('tableWrap');
        const assetPicker = document.getElementById('assetPicker');

        if (!principalInput) return;

        const formatCur = (num) => new Intl.NumberFormat(currentLang === 'en' ? 'en-US' : 'es-ES', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(num);

        const parseNum = (val) => {
            const clean = val.replace(/[^0-9.-]/g, '');
            return parseFloat(clean) || 0;
        };

        const syncSliderAndInput = (inputEl, sliderEl, isInt = true) => {
            inputEl.addEventListener('input', () => {
                let val = parseNum(inputEl.value);
                sliderEl.value = val;
                inputEl.value = isInt ? Math.round(val).toLocaleString() : val;
                calculateGrowth();
            });
            sliderEl.addEventListener('input', () => {
                inputEl.value = isInt ? Math.round(sliderEl.value).toLocaleString() : sliderEl.value;
                calculateGrowth();
            });
        };

        syncSliderAndInput(principalInput, principalSlider, true);
        syncSliderAndInput(monthlyInput, monthlySlider, true);
        syncSliderAndInput(rateInput, rateSlider, false);
        syncSliderAndInput(inflationInput, inflationSlider, false);

        if (freqSelect) freqSelect.addEventListener('change', calculateGrowth);
        if (yearsSlider) {
            yearsSlider.addEventListener('input', () => {
                if (yearsLabel) yearsLabel.textContent = yearsSlider.value;
                if (inspectYearSlider) {
                    inspectYearSlider.max = yearsSlider.value;
                    if (parseInt(inspectYearSlider.value) > parseInt(yearsSlider.value)) {
                        inspectYearSlider.value = yearsSlider.value;
                    }
                }
                calculateGrowth();
            });
        }

        if (inspectYearSlider) {
            inspectYearSlider.addEventListener('input', () => {
                inspectYearLabel.textContent = (currentLang === 'en' ? 'Year ' : 'Año ') + inspectYearSlider.value;
                updateInspectorDetails();
            });
        }

        if (tableToggle && tableWrap) {
            tableToggle.onclick = () => {
                const isHidden = tableWrap.style.display === 'none';
                tableWrap.style.display = isHidden ? 'block' : 'none';
                const chevron = tableToggle.querySelector('.table-toggle-chevron');
                if (chevron) {
                    if (isHidden) chevron.classList.add('collapsed');
                    else chevron.classList.remove('collapsed');
                }
            };
        }

        if (assetPicker) {
            const buttons = assetPicker.querySelectorAll('.asset-btn');
            buttons.forEach(btn => {
                btn.onclick = () => {
                    buttons.forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    
                    const asset = btn.dataset.asset;
                    const preset = presets[asset];
                    if (preset) {
                        rateInput.value = preset.rate;
                        rateSlider.value = preset.rate;
                        inflationInput.value = preset.inflation;
                        inflationSlider.value = preset.inflation;
                        freqSelect.value = preset.frequency;
                        calculateGrowth();
                    }
                };
            });
        }

        if (btnCalc) {
            btnCalc.onclick = calculateGrowth;
        }

        let calculatedPoints = [];

        function calculateGrowth() {
            const principal = parseNum(principalInput.value);
            const monthly = parseNum(monthlyInput.value);
            const rate = parseFloat(rateInput.value) / 100;
            const inflation = parseFloat(inflationInput.value) / 100;
            const frequency = parseInt(freqSelect.value);
            const years = parseInt(yearsSlider.value);

            calculatedPoints = [];
            let balance = principal;
            let contributions = 0;
            let interestGains = 0;

            for (let year = 1; year <= years; year++) {
                for (let month = 1; month <= 12; month++) {
                    balance += monthly;
                    contributions += monthly;

                    if (frequency === 12) {
                        const interest = balance * (rate / 12);
                        balance += interest;
                        interestGains += interest;
                    } 
                    else if (frequency >= 12) {
                        const interest = balance * (Math.pow(1 + rate / frequency, frequency / 12) - 1);
                        balance += interest;
                        interestGains += interest;
                    } 
                    else if (frequency === 4 && month % 3 === 0) {
                        const interest = balance * (rate / 4);
                        balance += interest;
                        interestGains += interest;
                    } 
                    else if (frequency === 1 && month === 12) {
                        const interest = balance * rate;
                        balance += interest;
                        interestGains += interest;
                    }
                }

                const realValue = balance / Math.pow(1 + inflation, year);

                calculatedPoints.push({
                    year: year,
                    principal: principal,
                    contributions: contributions,
                    interest: interestGains,
                    balance: balance,
                    realValue: realValue
                });
            }

            const finalData = calculatedPoints[calculatedPoints.length - 1];
            document.getElementById('sumTotal').textContent = formatCur(finalData.balance);
            document.getElementById('sumInterest').textContent = formatCur(finalData.interest);
            document.getElementById('sumReal').textContent = formatCur(finalData.realValue);

            const tbody = document.getElementById('tableBody');
            if (tbody) {
                tbody.innerHTML = calculatedPoints.map(p => `
                    <tr>
                        <td style="text-align:left;">${currentLang === 'en' ? 'Year' : 'Año'} ${p.year}</td>
                        <td>${formatCur(p.principal)}</td>
                        <td>${formatCur(p.contributions)}</td>
                        <td>${formatCur(p.interest)}</td>
                        <td><strong>${formatCur(p.balance)}</strong></td>
                        <td class="text-orange">${formatCur(p.realValue)}</td>
                    </tr>
                `).join('');
            }

            if (inspectYearSlider) {
                inspectYearSlider.max = years;
                if (parseInt(inspectYearSlider.value) > years) {
                    inspectYearSlider.value = years;
                }
                inspectYearLabel.textContent = (currentLang === 'en' ? 'Year ' : 'Año ') + inspectYearSlider.value;
            }

            updateInspectorDetails();
            drawChart();
        }

        function updateInspectorDetails() {
            if (calculatedPoints.length === 0) return;
            const inspectIdx = parseInt(inspectYearSlider.value) - 1;
            const data = calculatedPoints[inspectIdx] || calculatedPoints[calculatedPoints.length - 1];

            document.getElementById('inspPrincipal').textContent = formatCur(data.principal);
            document.getElementById('inspContrib').textContent = formatCur(data.contributions);
            document.getElementById('inspInterest').textContent = formatCur(data.interest);
            document.getElementById('inspTotal').textContent = formatCur(data.balance);
            document.getElementById('inspReal').textContent = formatCur(data.realValue);
        }

        function drawChart() {
            const ctx = document.getElementById('compoundChart').getContext('2d');
            if (compoundChartInstance) {
                compoundChartInstance.destroy();
            }

            const yearsLabels = calculatedPoints.map(p => (currentLang === 'en' ? 'Yr ' : 'Año ') + p.year);
            const balanceData = calculatedPoints.map(p => p.balance);
            const contributionsData = calculatedPoints.map(p => p.principal + p.contributions);
            const realValueData = calculatedPoints.map(p => p.realValue);

            const isLight = document.body.classList.contains('light-mode');
            const gridColor = isLight ? '#cbd5e1' : 'rgba(255, 255, 255, 0.05)';
            const textColor = isLight ? '#0f172a' : '#94a3b8';

            const activeBtn = assetPicker.querySelector('.asset-btn.active');
            let primaryColor = '#00f3ff';
            if (activeBtn) {
                const accent = activeBtn.dataset.accent;
                if (accent === 'emerald') primaryColor = '#10b981';
                else if (accent === 'purple') primaryColor = '#a855f7';
                else if (accent === 'orange') primaryColor = '#f97316';
                else if (accent === 'blue') primaryColor = '#3b82f6';
                else if (accent === 'gold') primaryColor = '#eab308';
            }

            compoundChartInstance = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: yearsLabels,
                    datasets: [
                        {
                            label: currentLang === 'en' ? 'Total Balance' : 'Saldo Total',
                            data: balanceData,
                            borderColor: primaryColor,
                            backgroundColor: isLight ? 'rgba(0, 243, 255, 0.05)' : 'rgba(0, 243, 255, 0.02)',
                            fill: true,
                            tension: 0.3,
                            borderWidth: 2
                        },
                        {
                            label: currentLang === 'en' ? 'Total Contributions' : 'Contribuciones Totales',
                            data: contributionsData,
                            borderColor: isLight ? '#64748b' : 'rgba(255, 255, 255, 0.3)',
                            borderDash: [5, 5],
                            fill: false,
                            tension: 0.1,
                            borderWidth: 1.5
                        },
                        {
                            label: currentLang === 'en' ? 'Real Value (Inflation Adj.)' : 'Valor Real (Ajustado Inflación)',
                            data: realValueData,
                            borderColor: '#f97316',
                            fill: false,
                            tension: 0.2,
                            borderWidth: 1.5
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            labels: {
                                color: textColor,
                                font: { family: 'JetBrains Mono, monospace', size: 9 }
                            }
                        },
                        tooltip: {
                            mode: 'index',
                            intersect: false,
                            backgroundColor: isLight ? '#ffffff' : '#0d121e',
                            titleColor: isLight ? '#0f172a' : '#ffffff',
                            bodyColor: isLight ? '#0f172a' : '#ffffff',
                            borderColor: primaryColor,
                            borderWidth: 1,
                            titleFont: { family: 'JetBrains Mono, monospace', size: 10 },
                            bodyFont: { family: 'JetBrains Mono, monospace', size: 10 }
                        }
                    },
                    scales: {
                        x: {
                            grid: { color: gridColor },
                            ticks: { color: textColor, font: { family: 'JetBrains Mono, monospace', size: 9 } }
                        },
                        y: {
                            grid: { color: gridColor },
                            ticks: { 
                                color: textColor, 
                                font: { family: 'JetBrains Mono, monospace', size: 9 },
                                callback: function(value) {
                                    return '$' + value.toLocaleString();
                                }
                            }
                        }
                    }
                }
            });
        }

        calculateGrowth();
    }

    if (commonUser) {
        initCompoundCalculator();
    } else {
        window.addEventListener('authReady', () => {
            initCompoundCalculator();
        });
    }
