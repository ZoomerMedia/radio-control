#!/bin/sh
# this should check for multiples and kill if there are
nowplaying1=`ps -ef | grep nowplaying-classical.sh | grep -v grep | awk '{print $1}'`
if [ -z "$nowplaying1" ]; then
 /var/www/html/cronjobs/classical963/nowplaying-classical.sh &
 exit
fi
exit
