#!/bin/bash
page_url='morseboard.trollbox.org'
echo "🚀 Deploying to ${page_url}..."
rsync src/* root@${page_url}:/srv/http/${page_url}/
echo "✅ Deployment successful."
