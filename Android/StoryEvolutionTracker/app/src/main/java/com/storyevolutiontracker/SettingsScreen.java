package com.storyevolutiontracker;

import android.content.Intent;
import android.support.v7.app.AppCompatActivity;
import android.os.Bundle;
import android.util.Log;
import android.view.View;
import android.widget.RadioButton;

import com.storyevolutiontracker.util.UpdateNewsReceiver;
import com.storyevolutiontracker.util.ValuesAndUtil;

import org.json.JSONException;
import org.json.JSONObject;

public class SettingsScreen extends AppCompatActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_settings_screen);

        JSONObject user = ValuesAndUtil.getInstance().loadUserData(getApplicationContext());
        try {
            String whichUpdateFreq = user.getString("updateFreq");
            RadioButton updateFreq;
            switch(whichUpdateFreq) {
                case "never":
                    updateFreq = (RadioButton) findViewById(R.id.radio_never);
                    updateFreq.setChecked(true);
                case "15mins":
                    updateFreq = (RadioButton) findViewById(R.id.radio_15mins);
                    updateFreq.setChecked(true);
                    break;
                case "30mins":
                    updateFreq = (RadioButton) findViewById(R.id.radio_30mins);
                    updateFreq.setChecked(true);
                    break;
                case "1hour":
                    updateFreq = (RadioButton) findViewById(R.id.radio_oneHour);
                    updateFreq.setChecked(true);
                    break;
                case "6hours":
                    updateFreq = (RadioButton) findViewById(R.id.radio_6hours);
                    updateFreq.setChecked(true);
                    break;
                case "onceAday":
                    updateFreq = (RadioButton) findViewById(R.id.radio_onceAday);
                    updateFreq.setChecked(true);
                    break;
            }
        } catch (JSONException e) {
            e.printStackTrace();
        }
    }

    public void onDeleteAllDataClick(View view) {
        ValuesAndUtil.getInstance().deleteUserData(getApplicationContext());
        Intent intent = new Intent(this,MainActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_NEW_TASK);
        startActivity(intent);
        finish();
    }

    public void onClickUpdateFrequency(View view) throws JSONException {
        boolean checked = ((RadioButton) view).isChecked();
        UpdateNewsReceiver alarm = new UpdateNewsReceiver();
        JSONObject user = ValuesAndUtil.getInstance().loadUserData(getApplicationContext());
        switch(view.getId()) {
            case R.id.radio_never:
                if (checked) {
                    Log.d("SS","Clicked never");
                    alarm.setAlarm(getApplicationContext(),"never");
                    user.put("updateFreq","never");
                }
                break;
            case R.id.radio_15mins:
                if (checked) {
                    Log.d("SS","Clicked 15mins");
                    alarm.setAlarm(getApplicationContext(),"15mins");
                    user.put("updateFreq","15mins");
                }
                break;
            case R.id.radio_30mins:
                if(checked) {
                    Log.d("SS","Clicked 30mins");
                    alarm.setAlarm(getApplicationContext(),"30mins");
                    user.put("updateFreq","30mins");
                }
                break;
            case R.id.radio_oneHour:
                if(checked) {
                    Log.d("SS","Clicked hourly");
                    alarm.setAlarm(getApplicationContext(),"1hour");
                    user.put("updateFreq","1hour");
                }
                break;
            case R.id.radio_6hours:
                if(checked) {
                    Log.d("SS","Clicked 6 hours");
                    alarm.setAlarm(getApplicationContext(),"6hours");
                    user.put("updateFreq","6hours");
                }
                break;
            case R.id.radio_onceAday:
                if(checked) {
                    Log.d("SS","Clicked once a day");
                    alarm.setAlarm(getApplicationContext(),"onceAday");
                    user.put("updateFreq","onceAday");
                }
                break;
        }
        ValuesAndUtil.getInstance().saveUserData(user,getApplicationContext());
    }
}
