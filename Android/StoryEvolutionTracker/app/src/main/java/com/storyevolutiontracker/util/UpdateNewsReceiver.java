package com.storyevolutiontracker.util;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.support.v4.content.WakefulBroadcastReceiver;
import android.util.Log;

import org.json.JSONObject;

public class UpdateNewsReceiver extends WakefulBroadcastReceiver {

    private AlarmManager alarmManager;
    private PendingIntent alarmIntent;

    @Override
    public void onReceive(Context context, Intent intent) {
        Intent service = new Intent(context,UpdateNewsSchedulingService.class);
        startWakefulService(context,service);
    }

    public void setAlarm(Context context, String interval) {
        alarmManager = (AlarmManager)context.getSystemService(Context.ALARM_SERVICE);
        Intent intent = new Intent(context, UpdateNewsReceiver.class);
        alarmIntent = PendingIntent.getBroadcast(context, 0, intent, 0);

        switch(interval) {
            case "never":
                alarmManager.cancel(alarmIntent);
                Log.d("UNR","Cancelled alarm");
                break;
            case "15mins":
                alarmManager.setInexactRepeating(AlarmManager.ELAPSED_REALTIME_WAKEUP,
                        AlarmManager.INTERVAL_FIFTEEN_MINUTES,
                        AlarmManager.INTERVAL_FIFTEEN_MINUTES,
                        alarmIntent);
                Log.d("UNR","Set 15min alarm");
                break;
            case "30mins":
                alarmManager.setInexactRepeating(AlarmManager.ELAPSED_REALTIME_WAKEUP,
                        AlarmManager.INTERVAL_HALF_HOUR,
                        AlarmManager.INTERVAL_HALF_HOUR,
                        alarmIntent);
                Log.d("UNR","Set 30min alarm");
                break;
            case "1hour":
                alarmManager.setInexactRepeating(AlarmManager.ELAPSED_REALTIME_WAKEUP,
                        AlarmManager.INTERVAL_HOUR,
                        AlarmManager.INTERVAL_HOUR,
                        alarmIntent);
                Log.d("UNR","Set 1hour alarm");
                break;
            case "6hours":
                alarmManager.setInexactRepeating(AlarmManager.ELAPSED_REALTIME_WAKEUP,
                        AlarmManager.INTERVAL_HOUR*6,
                        AlarmManager.INTERVAL_HOUR*6,
                        alarmIntent);
                Log.d("UNR","Set 6hour alarm");
                break;
            case "onceAday":
                alarmManager.setInexactRepeating(AlarmManager.ELAPSED_REALTIME_WAKEUP,
                        AlarmManager.INTERVAL_DAY,
                        AlarmManager.INTERVAL_DAY,
                        alarmIntent);
                Log.d("UNR","Set once daily alarm");
                break;
        }

        // set to start to enabled/disabled on boot
        ComponentName receiver = new ComponentName(context, UpdateNewsBootReceiver.class);
        PackageManager pm = context.getPackageManager();
        if(interval.equals("never")) {
            pm.setComponentEnabledSetting(receiver,
                    PackageManager.COMPONENT_ENABLED_STATE_DISABLED,
                    PackageManager.DONT_KILL_APP);
        } else {
            pm.setComponentEnabledSetting(receiver,
                    PackageManager.COMPONENT_ENABLED_STATE_ENABLED,
                    PackageManager.DONT_KILL_APP);
        }
    }
}
