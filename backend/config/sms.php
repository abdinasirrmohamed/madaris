<?php
return [
 'enabled'=>(bool)env('SMS_ENABLED',false),'provider'=>env('SMS_PROVIDER','http'),'api_url'=>env('SMS_API_URL'),'balance_url'=>env('SMS_BALANCE_URL'),'api_key'=>env('SMS_API_KEY'),'api_secret'=>env('SMS_API_SECRET'),
 'sender_id'=>env('SMS_SENDER_ID','MADAARIS'),'callback_url'=>env('SMS_CALLBACK_URL'),'webhook_secret'=>env('SMS_WEBHOOK_SECRET'),'timeout_seconds'=>(int)ceil(((int)env('SMS_REQUEST_TIMEOUT_MS',15000))/1000),
 'max_retries'=>(int)env('SMS_MAX_RETRIES',3),'batch_size'=>(int)env('SMS_BATCH_SIZE',50),'max_recipients'=>(int)env('SMS_MAX_RECIPIENTS',5000),
];
