#!/bin/bash

export PATH=/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:/Users/mgsgde/.nvm/versions/node/v18.10.0/bin

# Load environment variables from .prod_env file
set -a # automatically export all variables
source ./.env/.prod_env
set +a # stop automatically exporting variables

# /Users/mgsgde/.nvm/versions/node/v18.10.0/bin/ts-node src/crawling-and-scraping/run-as-cron-job.ts
ts-node src/crawling-and-scraping/run-as-cron-job.ts