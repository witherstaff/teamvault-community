#!/bin/bash
eval $(dbus-launch --sh-syntax)
gnome-keyring-daemon --start --daemonize --components=secrets 2>/dev/null
exec /mnt/c/users/kpitc/OneDrive/Documents/teamvault/source/public/Downloads/teamvault-drive-linux "$@"
