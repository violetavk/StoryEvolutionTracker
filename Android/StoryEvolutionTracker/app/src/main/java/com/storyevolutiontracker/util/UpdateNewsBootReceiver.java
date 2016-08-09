package com.storyevolutiontracker.util;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/**
 * Created by violet on 08/08/2016.
 */
public class UpdateNewsBootReceiver extends BroadcastReceiver {
    UpdateNewsReceiver alarm = new UpdateNewsReceiver();
    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent.getAction().equals("android.intent.action.BOOT_COMPLETED")) {
            alarm.setAlarm(context);
        }
    }
}
