package com.storyevolutiontracker;

import android.content.Context;
import android.content.Intent;
import android.support.v7.app.AppCompatActivity;
import android.os.Bundle;
import android.util.Log;
import android.view.View;
import android.widget.EditText;

import org.json.JSONException;
import org.json.JSONObject;

import java.io.IOException;
import java.io.OutputStreamWriter;

public class GetUserName extends AppCompatActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_get_user_name);
    }

    public void onContinue(View view) {
        Intent intent = new Intent(this,NewsHomeScreen.class);
        EditText editText = (EditText) findViewById(R.id.userName);
        String userName = editText.getText().toString().trim();
        JSONObject user = createUser(userName);
        intent.putExtra(ValuesAndUtil.STORED_USER_DATA_EXTRA,user.toString());
        startActivity(intent);
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
