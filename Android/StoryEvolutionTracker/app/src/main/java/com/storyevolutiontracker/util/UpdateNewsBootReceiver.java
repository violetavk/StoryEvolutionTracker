package com.storyevolutiontracker.util;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

import org.json.JSONException;
import org.json.JSONObject;

public class UpdateNewsBootReceiver extends BroadcastReceiver {
    UpdateNewsReceiver alarm = new UpdateNewsReceiver();
    @Override
    public void onReceive(Context context, Intent intent) {
        String freq = null;
        try {
            freq = ValuesAndUtil.getInstance().loadUserData(context).getString("updateFreq");
        } catch (JSONException e) {
            e.printStackTrace();
            return;
        }
        if (intent.getAction().equals("android.intent.action.BOOT_COMPLETED")) {
            alarm.setAlarm(context,freq);
        }
    }
}
