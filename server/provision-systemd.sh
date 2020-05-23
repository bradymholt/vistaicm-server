#!/bin/bash

# This script provisions a systemd service and is intended to be run on the deployed host.

set -x

# Use name of script directly as service name
SERVICE_NAME="${PWD##*/}" 
DEPLOY_PATH="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

cat >/etc/systemd/system/$SERVICE_NAME.service <<EOT
[Service]
WorkingDirectory=$DEPLOY_PATH
ExecStart=/usr/bin/npm run prod
Restart=always
User=$USER

[Install]
WantedBy=multi-user.target
EOT

systemctl enable $SERVICE_NAME
systemctl restart $SERVICE_NAME