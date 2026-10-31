"""Convert a working-time Excel workbook (monthly sheets January–December) into a
Clockwise backup file that can be loaded in the app via "Load backup".

Usage:  python3 tools/excel_import.py Arbeitszeit.xlsx output.json
Requires: pip install openpyxl
"""
import datetime as dt
import json
import sys

import openpyxl

MONTHS = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli',
          'August', 'September', 'Oktober', 'November', 'Dezember']
COL = {'k1': 4, 'g1': 5, 'k2': 6, 'g2': 7, 'pause': 8, 'code': 10, 'note': 15}
FIRST_ROW, LAST_ROW = 4, 34


def hhmm(value):
    if value is None:
        return None
    if isinstance(value, (dt.time, dt.datetime)):
        return value.strftime('%H:%M')
    if isinstance(value, dt.timedelta):
        s = int(value.total_seconds())
        return f'{s // 3600:02d}:{s % 3600 // 60:02d}'
    return str(value)


def minutes(value):
    t = hhmm(value)
    return int(t[:2]) * 60 + int(t[3:5]) if t else None


def weekly_minutes(ws_settings, row):
    return [minutes(ws_settings.cell(row, c).value) or 0 for c in range(4, 11)]


def read_settings(wb):
    ws = wb['Voreinstellungen']
    year = ws['C2'].value
    periods = []
    for row in range(12, 17):
        start = ws.cell(row, 2).value
        if row == 12:
            start = dt.date(year, 1, 1)
        if isinstance(start, str) and start.startswith('=DATE('):
            y, m, d = (int(x) if x.strip().isdigit() else year for x in start[6:-1].split(','))
            start = dt.date(y, m, d)
        if isinstance(start, (dt.date, dt.datetime)):
            periods.append({'from': start.strftime('%Y-%m-%d'), 'min': weekly_minutes(ws, row)})
    name = ws['C3'].value if ws['C3'].value != 'Name, Vorname' else ''
    return year, {
        'name': name or '', 'pnr': str(ws['C4'].value or '') if ws['C4'].value else '',
        'land': 'NW', 'halfHolidays': True, 'pauseMode': 'fix', 'pauseMin': 45,
        'periods': periods, 'vacation': {str(year): ws['C36'].value or 0}, 'vacationCarry': {}, 'carry': 0,
    }


def read_days(wb, year):
    days = {}
    for month, sheet in enumerate(MONTHS, start=1):
        ws = wb[sheet]
        for row in range(FIRST_ROW, LAST_ROW + 1):
            try:
                date = dt.date(year, month, row - FIRST_ROW + 1)
            except ValueError:
                continue
            cell = lambda key: ws.cell(row, COL[key]).value
            blocks = [{'in': hhmm(cell(a)), 'out': hhmm(cell(b))}
                      for a, b in (('k1', 'g1'), ('k2', 'g2')) if cell(a) and cell(b)]
            entry = {'blocks': blocks}
            if cell('pause') is not None:
                entry['pause'] = minutes(cell('pause'))
            if cell('code'):
                entry['code'] = str(cell('code')).upper()
            if cell('note'):
                entry['note'] = str(cell('note'))
            if blocks or len(entry) > 1:
                days[date.isoformat()] = entry
    return days


def main(src, dst):
    wb = openpyxl.load_workbook(src)
    year, settings = read_settings(wb)
    state = {'version': 1, 'settings': settings, 'days': read_days(wb, year)}
    with open(dst, 'w', encoding='utf-8') as f:
        json.dump(state, f, ensure_ascii=False, indent=1)
    print(f'{len(state["days"])} days written to {dst}.')


if __name__ == '__main__':
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    main(sys.argv[1], sys.argv[2])
