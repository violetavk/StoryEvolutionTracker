package com.storyevolutiontracker;

import android.app.AlertDialog;
import android.content.Context;
import android.content.DialogInterface;
import android.content.Intent;
import android.support.design.widget.Snackbar;
import android.support.v7.app.AppCompatActivity;
import android.os.Bundle;
import android.util.Log;
import android.view.KeyEvent;
import android.view.View;
import android.view.inputmethod.EditorInfo;
import android.view.inputmethod.InputMethodManager;
import android.widget.Button;
import android.widget.EditText;
import android.widget.ListView;
import android.widget.TextView;
import android.widget.Toast;

import com.storyevolutiontracker.util.UpdateNewsReceiver;
import com.storyevolutiontracker.util.ValuesAndUtil;

import org.json.JSONException;
import org.json.JSONObject;

public class GetUserName extends AppCompatActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_get_user_name);
        EditText et = (EditText) findViewById(R.id.userName);
        InputMethodManager imm = (InputMethodManager) getSystemService(Context.INPUT_METHOD_SERVICE);
        imm.showSoftInput(et, InputMethodManager.SHOW_IMPLICIT);
        et.setOnEditorActionListener(new TextView.OnEditorActionListener() {
            @Override
            public boolean onEditorAction(TextView textView, int i, KeyEvent keyEvent) {
                boolean handled = false;
                if (i == EditorInfo.IME_ACTION_DONE) {
                    onContinue(null);
                    handled = true;
                }
                return handled;
            }
        });
    }

    public void onContinue(View view) {
        final Intent intent = new Intent(this,NewsHomeScreen.class);
        EditText editText = (EditText) findViewById(R.id.userName);
        String userName = editText.getText().toString().trim();

        if(userName == null || userName.equals("")) {
            Snackbar.make(view,"User name cannot be blank",Snackbar.LENGTH_SHORT).show();
            return;
        }

        final JSONObject user = createUser(userName);

        // ask about background update frequency
        final UpdateNewsReceiver alarm = new UpdateNewsReceiver();
        AlertDialog.Builder builder = new AlertDialog.Builder(GetUserName.this);
        builder.setTitle("Set background update frequency")
                .setSingleChoiceItems(R.array.updateFrequencyOptions, -1, new DialogInterface.OnClickListener() {
                    @Override
                    public void onClick(DialogInterface dialogInterface, int selected) {
                        try {
                            switch (selected) {
                                case 0:
                                    alarm.setAlarm(getApplicationContext(),"never");
                                    user.put("updateFreq","never");
                                    break;
                                case 1:
                                    alarm.setAlarm(getApplicationContext(),"15mins");
                                    user.put("updateFreq","15mins");
                                    break;
                                case 2:
                                    alarm.setAlarm(getApplicationContext(),"30mins");
                                    user.put("updateFreq","30mins");
                                    break;
                                case 3:
                                    alarm.setAlarm(getApplicationContext(),"1hour");
                                    user.put("updateFreq","1hour");
                                    break;
                                case 4:
                                    alarm.setAlarm(getApplicationContext(),"6hours");
                                    user.put("updateFreq","6hours");
                                    break;
                                case 5:
                                    alarm.setAlarm(getApplicationContext(),"onceAday");
                                    user.put("updateFreq","onceAday");
                                    break;
                                default:
                                    alarm.setAlarm(getApplicationContext(),"1hour");
                                    user.put("updateFreq","1hour");
                            }
                            ValuesAndUtil.getInstance().saveUserData(user,getApplicationContext());
                        } catch (JSONException e) {
                            e.printStackTrace();
                        }
                    }
                })
                .setCancelable(false)
                .setPositiveButton("Continue", null);

        final AlertDialog dialog = builder.create();
        dialog.setOnShowListener(new DialogInterface.OnShowListener() {
            @Override
            public void onShow(DialogInterface dialogInterface) {
                Button button = dialog.getButton(AlertDialog.BUTTON_POSITIVE);
                button.setOnClickListener(new View.OnClickListener() {
                    @Override
                    public void onClick(View view) {
                        ListView lv = dialog.getListView();
                        if(lv.getCheckedItemPosition() < 0) {
                            Toast.makeText(GetUserName.this,"One option must be selected",Toast.LENGTH_SHORT).show();
                        } else {
                            dialog.dismiss();
                            onChoosingFreq(intent);
                        }
                    }
                });
            }
        });
        dialog.show();
    }

    private void onChoosingFreq(Intent intent) {
        intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_NEW_TASK);
        startActivity(intent);
        finish();
    }

    private JSONObject createUser(String name) {
        try {
            JSONObject user = new JSONObject();
            user.put("username",name);
            Log.d("myapp",user.toString());
            ValuesAndUtil.getInstance().saveUserData(user,getApplicationContext());
            Log.d("myapp","Actally saved the user");
            return user;
        } catch (JSONException e) {
            Log.e("Exception", "JSON put failed: " + e.toString());
        }
        return null;
    }
}
