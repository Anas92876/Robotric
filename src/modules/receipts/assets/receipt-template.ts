// Receipt HTML, copied unchanged from the old templates/receipt.html.
// Placeholders: {{name}}; conditional blocks: {{#if x}}...{{/if}}.
export const RECEIPT_TEMPLATE = `<!DOCTYPE html>
<html lang="en" dir="ltr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Payment Receipt</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
    <style>
        @page {
            size: A4;
            margin: 40px 50px;
        }

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Inter', Arial, sans-serif;
            font-size: 10pt;
            color: #333;
            line-height: 1.5;
            direction: ltr;
            text-align: left;
        }
        
        .container {
            max-width: 100%;
            margin: 0 auto;
            padding: 0;
        }
        
        /* Header */
        .header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 25px;
            padding-bottom: 15px;
            border-bottom: 2px solid #003300;
        }

        .logo-container {
            flex-shrink: 0;
        }

        .logo {
            width: 150px;
            height: 90px;
            object-fit: contain;
        }

        .company-info {
            text-align: right;
        }

        .company-details {
            font-size: 10pt;
            color: #006600;
            line-height: 1.6;
            font-weight: 500;
        }
        
        /* Title */
        .title {
            text-align: center;
            font-size: 18pt;
            font-weight: bold;
            color: #003300;
            margin: 20px 0;
            text-transform: uppercase;
            letter-spacing: 1px;
        }

        /* Receipt Info */
        .receipt-info {
            display: flex;
            justify-content: space-between;
            margin-bottom: 15px;
            font-size: 9pt;
            color: #666;
        }

        .divider {
            border-top: 1px solid #ddd;
            margin: 15px 0;
        }
        
        /* Student Information */
        .section-title {
            font-size: 11pt;
            font-weight: 700;
            color: #003300;
            margin: 15px 0 8px 0;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .student-info {
            font-size: 10pt;
            color: #333;
            margin-bottom: 4px;
        }

        .student-info strong {
            font-weight: 600;
            min-width: 80px;
            display: inline-block;
        }
        
        /* Payment Table */
        .payment-table {
            width: 100%;
            border-collapse: collapse;
            margin: 15px 0;
        }

        .payment-table thead {
            background-color: #003300;
            color: white;
        }

        .payment-table th {
            padding: 8px 12px;
            text-align: left;
            font-weight: 600;
            font-size: 10pt;
        }

        .payment-table td {
            padding: 8px 12px;
            border: 1px solid #ddd;
            text-align: left;
        }
        
        .payment-table tbody tr:nth-child(even) {
            background-color: #f5f5f5;
        }
        
        .payment-table tbody tr:nth-child(odd) {
            background-color: white;
        }
        
        .remaining-balance-row {
            background-color: #e8f5e9 !important;
            font-weight: 700;
            color: #003300;
            border: 2px solid #003300 !important;
        }

        .remaining-balance-row td {
            font-size: 10pt;
            font-weight: 700;
        }

        /* Notes Section */
        .notes-section {
            margin: 15px 0;
        }

        .notes-title {
            font-size: 10pt;
            font-weight: 600;
            color: #003300;
            margin-bottom: 6px;
        }

        .notes-content {
            font-size: 9pt;
            color: #555;
            line-height: 1.5;
            padding: 8px;
            background-color: #f9f9f9;
            border-left: 3px solid #003300;
        }
        
        /* Footer */
        .footer {
            margin-top: 30px;
            text-align: center;
        }

        .issued-by {
            font-size: 9pt;
            color: #666;
            margin-bottom: 15px;
        }

        .signature-line {
            border-top: 1px solid #999;
            width: 180px;
            margin: 15px auto;
            padding-top: 5px;
        }

        .signature-label {
            font-size: 8pt;
            color: #999;
            text-align: center;
        }

        .thank-you {
            font-size: 10pt;
            font-weight: 600;
            color: #006600;
            margin: 15px 0 10px 0;
        }

        .footer-note {
            font-size: 7pt;
            color: #999;
            margin-top: 5px;
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- Header -->
        <div class="header">
            <div class="logo-container">
                <img src="{{logoBase64}}" alt="Robotrick Logo" class="logo" onerror="this.style.display='none'">
            </div>
            <div class="company-info">
                <div class="company-details">
                    Aleppo, Syria<br>
                    Phone: +963-942-060-440
                </div>
            </div>
        </div>

        <!-- Title -->
        <div class="title">{{receiptTitle}}</div>
        
        <!-- Receipt Info -->
        <div class="receipt-info">
            <div>Receipt #: {{receiptNumber}}</div>
            <div>
                <div>Date: {{paymentDate}}</div>
                <div>Time: {{paymentTime}}</div>
            </div>
        </div>
        
        <!-- Divider -->
        <div class="divider"></div>
        
        <!-- Student Information -->
        <div class="section-title">Student Information</div>
        <div class="student-info">
            <strong>Name:</strong> {{studentName}}
        </div>
        <div class="student-info">
            <strong>Email:</strong> {{studentEmail}}
        </div>
        <div class="student-info">
            <strong>Course:</strong> {{courseTitle}}
        </div>
        
        <!-- Payment Details Table -->
        <div class="section-title">Payment Details</div>
        <table class="payment-table">
            <thead>
                <tr>
                    <th>Description</th>
                    <th>Amount ({{currencyLabel}})</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>{{paymentLabel}} Total</td>
                    <td>{{currencySymbol}}{{totalAmount}} {{currencyLabel}}</td>
                </tr>
                <tr>
                    <td>Previously Paid</td>
                    <td>{{currencySymbol}}{{paidBefore}} {{currencyLabel}}</td>
                </tr>
                <tr>
                    <td>This Payment ({{paymentMethod}})</td>
                    <td>{{paidNowDisplay}}</td>
                </tr>
                <tr class="remaining-balance-row">
                    <td>Remaining Balance</td>
                    <td>{{currencySymbol}}{{remainingBalance}} {{currencyLabel}}</td>
                </tr>
            </tbody>
        </table>
        
        <!-- Notes Section -->
        {{#if enrollmentNotes}}
        <div class="notes-section">
            <div class="notes-title">Enrollment Notes:</div>
            <div class="notes-content">{{enrollmentNotes}}</div>
        </div>
        {{/if}}

        {{#if paymentNotes}}
        <div class="notes-section">
            <div class="notes-title">Payment Notes:</div>
            <div class="notes-content">{{paymentNotes}}</div>
        </div>
        {{/if}}

        <!-- Footer -->
        <div class="footer">
            <div class="issued-by">
                Received by: {{issuedByName}} (Reception)
            </div>

            <div class="signature-line">
                <div class="signature-label">Authorized Signature</div>
            </div>

            <div class="thank-you">Thank you for your payment!</div>
            <div class="footer-note">
                This is a computer-generated receipt and does not require a signature.
            </div>
        </div>
    </div>
</body>
</html>
`;
