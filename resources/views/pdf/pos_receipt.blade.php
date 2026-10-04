<!DOCTYPE html>
<html lang="en">
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
    <meta charset="utf-8">
    <title>POS Receipt - {{ $user->name }}</title>
    <style>
        @page {
            margin: 2mm 3mm 2mm 2mm;
        }

        * {
            font-family: 'solaimanlipi', 'DejaVu Sans Mono', 'DejaVu Sans', monospace, sans-serif;
            box-sizing: border-box;
            color: #000000;
        }

        body {
            width: 100%;
            margin: 0;
            padding: 0 1px 0 0;
            font-family: 'solaimanlipi', 'DejaVu Sans Mono', 'DejaVu Sans', monospace, sans-serif;
            font-size: 8pt;
            color: #000000;
            line-height: 1.25;
            background-color: #ffffff;
            text-align: center;
        }

        table, tr, td, th, div, p, span, h1, h2, h3, h4, h5, h6, strong, b, em {
            font-family: 'solaimanlipi', 'DejaVu Sans Mono', 'DejaVu Sans', monospace, sans-serif;
            color: #000000;
        }

        .receipt-header {
            margin-bottom: 3px;
        }

        .tour-name {
            font-size: 9.5pt;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 0.3px;
            margin: 0 0 1px 0;
            line-height: 1.2;
            word-wrap: break-word;
        }

        .receipt-badge {
            display: inline-block;
            border: 1px solid #000000;
            padding: 1px 4px;
            font-size: 7.2pt;
            font-weight: bold;
            text-transform: uppercase;
            margin: 2px 0;
            letter-spacing: 0.3px;
        }

        .receipt-date {
            font-size: 7pt;
            margin-top: 1px;
            color: #000000;
        }

        .dashed-line {
            border-top: 1px dashed #000000;
            margin: 3px 0;
            width: 100%;
        }

        .double-line {
            border-top: 1px solid #000000;
            border-bottom: 1px solid #000000;
            height: 2px;
            margin: 3px 0;
            width: 100%;
        }

        .data-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 8pt;
            margin: 2px 0;
        }

        .data-table td {
            padding: 1px 0;
            vertical-align: top;
        }

        .text-left {
            text-align: left;
        }

        .text-right {
            text-align: right;
        }

        .text-center {
            text-align: center;
        }

        .bold {
            font-weight: bold;
        }

        .net-row {
            font-size: 8.5pt;
            font-weight: bold;
        }

        .action-title {
            font-size: 7.5pt;
            font-weight: bold;
            text-transform: uppercase;
            text-align: left;
            margin: 3px 0 2px 0;
        }

        .action-item {
            font-size: 7.5pt;
            padding: 1px 0;
        }

        .footer {
            font-size: 6.8pt;
            margin-top: 4px;
            text-align: center;
        }
    </style>
</head>
<body>

    <!-- Header -->
    <div class="receipt-header">
        <div class="tour-name">{{ $tour->name }}</div>
        <div class="receipt-badge">MEMBER SETTLEMENT SLIP</div>
        <div class="receipt-date">{{ $generatedAt }}</div>
    </div>

    <div class="double-line"></div>

    <!-- Member Info -->
    <table class="data-table">
        <tr>
            <td class="text-left" style="width: 40%;">MEMBER:</td>
            <td class="text-right bold" style="width: 60%; word-break: break-word;">{{ $user->name }}</td>
        </tr>
        <tr>
            <td class="text-left">STATUS:</td>
            <td class="text-right bold">
                @if($balance['status'] === 'credit')
                    RECEIVES (+{{ number_format(abs($balance['net_balance']), 2) }})
                @elseif($balance['status'] === 'debt')
                    OWES (-{{ number_format(abs($balance['net_balance']), 2) }})
                @else
                    SETTLED (0.00)
                @endif
            </td>
        </tr>
    </table>

    <div class="dashed-line"></div>

    <!-- Financial Breakdown -->
    <table class="data-table">
        <tr>
            <td class="text-left">Total Paid:</td>
            <td class="text-right bold">{{ number_format($balance['total_paid'], 2) }}</td>
        </tr>
        <tr>
            <td class="text-left">Total Owed:</td>
            <td class="text-right bold">{{ number_format($balance['total_owed'], 2) }}</td>
        </tr>
    </table>

    <div class="dashed-line"></div>

    <!-- Net Balance -->
    <table class="data-table net-row">
        <tr>
            <td class="text-left">NET BALANCE:</td>
            <td class="text-right">
                @if($balance['net_balance'] > 0.009)
                    +{{ number_format($balance['net_balance'], 2) }}
                @elseif($balance['net_balance'] < -0.009)
                    -{{ number_format(abs($balance['net_balance']), 2) }}
                @else
                    0.00
                @endif
            </td>
        </tr>
    </table>

    <div class="dashed-line"></div>

    <!-- Transfers / Action Items -->
    @if($balance['status'] === 'debt' && count($actions) > 0)
        <div class="action-title">ACTION REQUIRED (PAY TO):</div>
        <table class="data-table">
            @foreach($actions as $act)
                <tr class="action-item">
                    <td class="text-left" style="width: 65%;">➡️ {{ $act['to']['name'] }}</td>
                    <td class="text-right bold" style="width: 35%;">{{ $act['amount_formatted'] }}</td>
                </tr>
            @endforeach
        </table>
        <div class="dashed-line"></div>
    @elseif($balance['status'] === 'credit' && count($actions) > 0)
        <div class="action-title">RECEIVE FROM:</div>
        <table class="data-table">
            @foreach($actions as $act)
                <tr class="action-item">
                    <td class="text-left" style="width: 65%;">⬅️ {{ $act['from']['name'] }}</td>
                    <td class="text-right bold" style="width: 35%;">{{ $act['amount_formatted'] }}</td>
                </tr>
            @endforeach
        </table>
        <div class="dashed-line"></div>
    @else
        <div style="font-size: 7.5pt; font-weight: bold; margin: 3px 0;">
            *** ALL SETTLED - NO DUES ***
        </div>
        <div class="dashed-line"></div>
    @endif

    <!-- Footer -->
    <div class="footer">
        <div>Total Tour Expenses: {{ number_format($settlement['total_approved_expenses'], 2) }}</div>
        <div style="margin-top: 2px;">*** TourTally Smart Settlement ***</div>
        <div style="font-size: 6pt; color: #333333; margin-top: 2px;">Keep this slip for your records.</div>
    </div>

</body>
</html>
