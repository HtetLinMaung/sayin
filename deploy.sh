#! /usr/bin/bash
git pull && sudo docker-compose down && sudo docker image rm htetlinmaung/sayin && sudo docker-compose up -d