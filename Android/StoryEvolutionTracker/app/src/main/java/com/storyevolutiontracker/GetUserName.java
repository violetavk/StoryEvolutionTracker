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

    public final static String userData = "user_data";
    public final static String STORED_USER_DATA = "com.storyevolutiontracker.USERDATA";

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
        intent.putExtra("com.storyevolutiontracker.USERDATA",user.toString());
        startActivity(intent);
    }

    private JSONObject createUser(String name) {
        try {
            JSONObject user = new JSONObject();
            user.put("username",name);
            Log.d("myapp",user.toString());

            OutputStreamWriter outputStreamWriter = new OutputStreamWriter(openFileOutput(userData, Context.MODE_PRIVATE));
            outputStreamWriter.write(user.toString());
            outputStreamWriter.close();
            Log.d("myapp","Actally saved the user");
            return user;
        }
        catch (IOException e) {
            Log.e("Exception", "File write failed: " + e.toString());
        } catch (JSONException e) {
            Log.e("Exception", "JSON put failed: " + e.toString());
        }
        return null;
    }
}
