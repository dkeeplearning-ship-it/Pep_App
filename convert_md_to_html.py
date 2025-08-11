#!/usr/bin/env python3
import re

def convert_md_to_html():
    # Read the markdown file
    with open('docs/api/ERP_Integration_API_Requirements.md', 'r', encoding='utf-8') as f:
        md_content = f.read()

    # Simple markdown to HTML conversion
    html = md_content

    # Convert headers
    html = re.sub(r'^# (.*)', r'<h1>\1</h1>', html, flags=re.MULTILINE)
    html = re.sub(r'^## (.*)', r'<h2>\1</h2>', html, flags=re.MULTILINE)
    html = re.sub(r'^### (.*)', r'<h3>\1</h3>', html, flags=re.MULTILINE)
    html = re.sub(r'^#### (.*)', r'<h4>\1</h4>', html, flags=re.MULTILINE)

    # Convert code blocks
    html = re.sub(r'```json\n(.*?)\n```', r'<pre><code class="json">\1</code></pre>', html, flags=re.DOTALL)
    html = re.sub(r'```\n(.*?)\n```', r'<pre><code>\1</code></pre>', html, flags=re.DOTALL)

    # Convert inline code
    html = re.sub(r'`([^`]+)`', r'<code>\1</code>', html)

    # Convert bold text
    html = re.sub(r'\*\*(.*?)\*\*', r'<strong>\1</strong>', html)

    # Convert bullet points
    lines = html.split('\n')
    in_list = False
    result_lines = []
    
    for line in lines:
        if line.strip().startswith('- '):
            if not in_list:
                result_lines.append('<ul>')
                in_list = True
            result_lines.append(f'<li>{line.strip()[2:]}</li>')
        else:
            if in_list:
                result_lines.append('</ul>')
                in_list = False
            result_lines.append(line)
    
    if in_list:
        result_lines.append('</ul>')
    
    html = '\n'.join(result_lines)

    # Convert line breaks (but preserve existing HTML)
    html = re.sub(r'\n(?!<)', '<br>\n', html)

    # Add CSS styling
    html_with_css = f'''<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>ERP Integration API Requirements</title>
    <style>
        body {{
            font-family: Arial, sans-serif;
            margin: 40px;
            line-height: 1.6;
            color: #333;
            max-width: 1200px;
        }}
        h1, h2, h3, h4 {{
            color: #2c3e50;
            margin-top: 30px;
            margin-bottom: 15px;
        }}
        h1 {{
            border-bottom: 2px solid #3498db;
            padding-bottom: 10px;
            font-size: 28px;
        }}
        h2 {{
            border-bottom: 1px solid #bdc3c7;
            padding-bottom: 5px;
            font-size: 24px;
        }}
        h3 {{
            font-size: 20px;
        }}
        h4 {{
            font-size: 18px;
        }}
        code {{
            background-color: #f4f4f4;
            padding: 2px 6px;
            border-radius: 3px;
            font-family: 'Courier New', monospace;
            font-size: 14px;
        }}
        pre {{
            background-color: #f8f8f8;
            padding: 20px;
            border-radius: 5px;
            overflow-x: auto;
            border-left: 4px solid #3498db;
            margin: 20px 0;
        }}
        pre code {{
            background-color: transparent;
            padding: 0;
            font-size: 13px;
        }}
        table {{
            border-collapse: collapse;
            width: 100%;
            margin: 20px 0;
        }}
        th, td {{
            border: 1px solid #ddd;
            padding: 12px;
            text-align: left;
        }}
        th {{
            background-color: #f2f2f2;
            font-weight: bold;
        }}
        ul, ol {{
            padding-left: 30px;
        }}
        li {{
            margin-bottom: 8px;
        }}
        strong {{
            color: #2c3e50;
        }}
        .endpoint {{
            background-color: #e8f4fd;
            padding: 10px;
            border-radius: 5px;
            margin: 10px 0;
        }}
        @media print {{
            body {{
                margin: 20px;
            }}
            h1, h2, h3, h4 {{
                page-break-after: avoid;
            }}
            pre {{
                page-break-inside: avoid;
            }}
        }}
    </style>
</head>
<body>
{html}
</body>
</html>'''

    # Save HTML file
    with open('docs/api/ERP_Integration_API_Requirements.html', 'w', encoding='utf-8') as f:
        f.write(html_with_css)

    print('HTML file created successfully at: docs/api/ERP_Integration_API_Requirements.html')
    print('You can open this file in a browser and use "Print to PDF" to create a PDF version.')

if __name__ == "__main__":
    convert_md_to_html()
