package com.storyevolutiontracker;

import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
import android.support.design.widget.FloatingActionButton;
import android.support.design.widget.Snackbar;
import android.support.v7.app.AppCompatActivity;
import android.support.v7.widget.Toolbar;
import android.util.Log;
import android.view.View;
import android.view.Menu;
import android.view.MenuItem;
import android.widget.EditText;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.OutputStreamWriter;
import java.io.UnsupportedEncodingException;

public class MainActivity extends AppCompatActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        Log.d("myapp","Running on create");

        // first check if user data exists
        boolean userExists = userHasData();
        if(userExists) {
            Log.d("myapp","User already existed");
            JSONObject user = ValuesAndUtil.getInstance().loadUserData(getApplicationContext());
            Intent intent = new Intent(this,NewsHomeScreen.class);
//            intent.putExtra("com.storyevolutiontracker.USERDATA",user.toString());
            startActivity(intent);
        } else {
            Log.d("myapp","Creating new user");
            setContentView(R.layout.activity_new_user_welcome); // display for new users
        }
    }

    public void onBeginClick(View view) {
        Intent intent = new Intent(this,GetUserName.class);
        startActivity(intent);
    }

    public boolean userHasData() {
        File file = getApplicationContext().getFileStreamPath(ValuesAndUtil.USER_DATA_FILE);
        return file.exists();
    }
}
