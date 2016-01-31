#!/bin/bash

SCRIPT=$(readlink -f "$0")
SCRIPT_PATH=$(dirname "$SCRIPT")

BAR_APP_PATH=$(readlink -f "$SCRIPT_PATH/../..")

"$BAR_APP_PATH/bartest" $@
