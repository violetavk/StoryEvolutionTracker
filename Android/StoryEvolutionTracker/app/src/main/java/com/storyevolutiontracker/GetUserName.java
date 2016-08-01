package com.storyevolutiontracker;

import android.content.Context;
import android.content.Intent;
import android.support.v7.app.AppCompatActivity;
import android.os.Bundle;
import android.text.InputType;
import android.util.Log;
import android.view.KeyEvent;
import android.view.View;
import android.view.inputmethod.EditorInfo;
import android.view.inputmethod.InputMethodManager;
import android.widget.EditText;
import android.widget.TextView;

import org.json.JSONException;
import org.json.JSONObject;

import java.io.IOException;
import java.io.OutputStreamWriter;

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
        Intent intent = new Intent(this,NewsHomeScreen.class);
        EditText editText = (EditText) findViewById(R.id.userName);
        String userName = editText.getText().toString().trim();
        JSONObject user = createUser(userName);
        intent.putExtra(ValuesAndUtil.STORED_USER_DATA_EXTRA,user.toString());
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
