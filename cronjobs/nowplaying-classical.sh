#!/bin/sh
while true; do
	sleep 10
	
	NPINFO=`wget -qO- http://radioservices.zml.ca/CFMZ/CFMZMSG.XML |grep "item type" |cut -f 2 -d \" `
		if [ $NPINFO = "DWN" ] ; then
		echo ITSWEATHER > /dev/null 2>&1
		else
		curl -s -m 5 --connect-timeout 2 -o /home/zwebnode/nodejs/radio-server/cfmzmsg.xml http://radioservices.zml.ca/CFMZ/CFMZMSG.XML
		#curl -s -m 5 --connect-timeout 2 -o /var/www/html/www.classical963fm.com/cfmzmsg.xml http://www1.am740.ca/nowplaying/cfmzmsg.xml
		fi
done
