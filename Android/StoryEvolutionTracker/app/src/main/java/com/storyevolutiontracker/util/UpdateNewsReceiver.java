package com.storyevolutiontracker.util;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.support.v4.content.WakefulBroadcastReceiver;

public class UpdateNewsReceiver extends WakefulBroadcastReceiver {

    private AlarmManager alarmManager;
    private PendingIntent alarmIntent;
    private boolean isSet;

    @Override
    public void onReceive(Context context, Intent intent) {
        Intent service = new Intent(context,UpdateNewsSchedulingService.class);
        startWakefulService(context,service);
    }

    public void setAlarm(Context context) {
        alarmManager = (AlarmManager)context.getSystemService(Context.ALARM_SERVICE);
        Intent intent = new Intent(context, UpdateNewsReceiver.class);
        alarmIntent = PendingIntent.getBroadcast(context, 0, intent, 0);

        // set alarm to update every hour
        alarmManager.setInexactRepeating(AlarmManager.ELAPSED_REALTIME_WAKEUP,
                AlarmManager.INTERVAL_HOUR,
                AlarmManager.INTERVAL_HOUR,
                alarmIntent);

        // set to start alarm on boot
        ComponentName receiver = new ComponentName(context, UpdateNewsBootReceiver.class);
        PackageManager pm = context.getPackageManager();
        pm.setComponentEnabledSetting(receiver,
                PackageManager.COMPONENT_ENABLED_STATE_ENABLED,
                PackageManager.DONT_KILL_APP);

        isSet = true;
    }

    public boolean isSet() {
        return isSet;
    }
}
