#!/bin/bash
page_url='morseboard.trollbox.org'
rsync -v src/* root@${page_url}:/srv/http/${page_url}/
