import pandas as pd
import numpy as np

def compute_rsi(series, period=14):
    delta = series.diff()
    gain = (delta.where(delta > 0, 0)).rolling(window=period).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()
    rs = gain / loss
    return 100 - (100 / (1 + rs))

def compute_bollinger_bands(series, period=20, std_dev=2):
    sma = series.rolling(window=period).mean()
    std = series.rolling(window=period).std()
    upper = sma + (std * std_dev)
    lower = sma - (std * std_dev)
    return upper, lower

def compute_cvd(df):
    """
    Approximation of CVD (Cumulative Volume Delta).
    If close > open, assume positive delta. If close < open, assume negative delta.
    """
    deltas = []
    for _, row in df.iterrows():
        if row['close'] > row['open']:
            deltas.append(row['volume'])
        elif row['close'] < row['open']:
            deltas.append(-row['volume'])
        else:
            deltas.append(0)
    
    cvd = pd.Series(deltas).cumsum()
    return cvd
