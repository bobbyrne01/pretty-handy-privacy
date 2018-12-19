#!/bin/sh

mkdir -p build
convert images/originalAppIcon.png -bordercolor none -border 2x2 -background Black -alpha background -channel A -blur 0x10 -level 0,50% build/icon.png
cp images/originalTrayIcon.png trayIcon.png
