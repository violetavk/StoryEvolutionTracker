package com.storyevolutiontracker;

import android.content.Intent;
import android.support.design.widget.Snackbar;
import android.support.v7.app.AppCompatActivity;
import android.os.Bundle;
import android.util.Log;
import android.view.View;
import android.widget.TextView;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;
import org.w3c.dom.Text;

import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;

public class ConfirmArticle extends AppCompatActivity {

    JSONObject newArticleData;
    JSONObject userData;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_confirm_article);

        try {
            newArticleData = new JSONObject(getIntent().getStringExtra(ValuesAndUtil.NEW_ARTICLE_DATA));
            userData = new JSONObject(getIntent().getStringExtra(ValuesAndUtil.STORED_USER_DATA_EXTRA));

            // display headline
            TextView headlineView = (TextView) findViewById(R.id.headline_field);
            String headline = newArticleData.getString("headline");
            headlineView.setText(headline);

            // display date published
            TextView dateView = (TextView) findViewById(R.id.datepub_field);
            long dateMillis = newArticleData.getInt("date");
            dateView.setText(ValuesAndUtil.getInstance().formatDate(dateMillis));

        } catch (JSONException e) {
            Log.e("ERROR","Failed reading JSON: " + e.getMessage());
            return;
        }

    }

    public void onCancelledConfirmClick(View view) {
        Intent intent = new Intent(this,NewsHomeScreen.class);
        intent.putExtra(ValuesAndUtil.STORED_USER_DATA_EXTRA,userData.toString());
        startActivity(intent);
        finish();
    }


    public void onConfirmedArticleClick(View view) {
        JSONObject topic = new JSONObject();

        try {
            // put in original topic words
            JSONArray topicWords = newArticleData.getJSONArray("topicWords");
            topic.put("originalTopicWords",topicWords);

            // put in most recent timestamp
            long timestamp = newArticleData.getLong("date");
            topic.put("lastTimeStamp",timestamp);

            // put in most recent signature
            String signature = newArticleData.getString("signature");
            topic.put("lastSignature",signature);

            // put in modified topic words
            JSONObject modifiedTopicWords = newArticleData.getJSONObject("topicWordsFreq");
            topic.put("modifiedTopicWords",topicWords);
            newArticleData.remove("topicWordsFreq");

            // create timeline
            JSONArray timeline = new JSONArray();
            timeline.put(newArticleData);
            topic.put("timeline",timeline);

            Log.d("CA","Final topic: " + topic.toString(4));

            if(userData.has("topics")) {
                JSONArray topics = addToExistingJSON(userData.getJSONArray("topics"),0,topic);
                userData.put("topics",topics);
            } else {
                JSONArray topics = new JSONArray();
                topics.put(topic);
                userData.put("topics",topics);
            }
            ValuesAndUtil.getInstance().saveUserData(userData,getApplicationContext());
            Log.d("CA","Done with this! Saved!");
            Intent intent = new Intent(this,NewsHomeScreen.class);
            intent.putExtra(ValuesAndUtil.STORED_USER_DATA_EXTRA,userData.toString());
            startActivity(intent);
            finish();
        } catch (JSONException e) {
            Log.e("CA","CAUGHT JSONEXCEPTION: " + e.getMessage());
            e.printStackTrace();
        }
    }

    public JSONArray addToExistingJSON(JSONArray existing, int index, JSONObject toAdd) {
        ArrayList<JSONObject> list = new ArrayList<JSONObject>();
        try {
            for (int i = 0; i < existing.length(); i++) {
                list.add((JSONObject) existing.get(i));
            }
            list.add(index, toAdd);

            JSONArray toReturn = new JSONArray();
            for (int i = 0; i < existing.length(); i++) {
                toReturn.put(existing.get(i));
            }

            return toReturn;

        } catch (JSONException e) {
            e.printStackTrace();
        }
        return null;
    }
}
