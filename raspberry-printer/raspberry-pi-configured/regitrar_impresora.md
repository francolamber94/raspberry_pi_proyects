curl -X POST https://lamber.ngrok.app/api/printer/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Printer-SunsetDrive-Test",
    "companyId": "58065731-debb-423a-9340-98829fde4a06",
    "ipAddress": "192.168.68.62"
  }'

  sshpass -p 'Dire4327' ssh francolamber@192.168.68.62 "cd /home/francolamber/printer-client && node setup-printer.js"