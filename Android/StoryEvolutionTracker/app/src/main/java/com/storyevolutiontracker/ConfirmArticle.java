package com.storyevolutiontracker;

import android.content.Intent;
import android.support.v7.app.AppCompatActivity;
import android.os.Bundle;
import android.util.Log;
import android.view.View;
import android.widget.Button;
import android.widget.TextView;

import com.storyevolutiontracker.util.ValuesAndUtil;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

public class ConfirmArticle extends AppCompatActivity {

    JSONObject newArticleData;
    JSONObject userData;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_confirm_article);

        try {
            newArticleData = new JSONObject(getIntent().getStringExtra(ValuesAndUtil.NEW_ARTICLE_DATA));
            userData = ValuesAndUtil.getInstance().loadUserData(getApplicationContext());

            TextView headlineView = (TextView) findViewById(R.id.headline_field);
            TextView dateView = (TextView) findViewById(R.id.datepub_field);
            Button confirmBtn = (Button) findViewById(R.id.ok_confirmarticle);

            boolean success = newArticleData.getBoolean("success");
            if(success) {
                // display headline
                String headline = newArticleData.getString("headline");
                headlineView.setText(headline);
                // display date
                long dateMillis = newArticleData.getInt("date");
                dateView.setText(ValuesAndUtil.getInstance().formatDate(dateMillis));
            } else {
                // display an error message instead because the article is not suitable for tracking
                headlineView.setText(R.string.unsuitableFormat);
                headlineView.setTextColor(getResources().getColor(R.color.Red));
                dateView.setText(R.string.notApplicable);
                dateView.setTextColor(getResources().getColor(R.color.Red));
                confirmBtn.setVisibility(View.INVISIBLE);
            }


        } catch (JSONException e) {
            Log.e("ERROR","Failed reading JSON: " + e.getMessage());
            return;
        }

    }

    public void onCancelledConfirmClick(View view) {
        Intent intent = new Intent(this,NewsHomeScreen.class);
        startActivity(intent);
        finish();
    }

    public void onConfirmedArticleClick(View view) {
        JSONObject topic = new JSONObject();

        try {
            // put in original topic words
            JSONArray topicWords = newArticleData.getJSONArray("topicWords");
            topic.put("originalTopicWords",topicWords);

            String originalHeadline = newArticleData.getString("headline");
            topic.put("originalHeadline",originalHeadline);

            // put in most recent timestamp
            long timestamp = newArticleData.getLong("date");
            topic.put("lastTimeStamp",timestamp);

            // put in most recent signature
            String signature = newArticleData.getString("signature");
            topic.put("lastSignature",signature);

            // get category on bbc
            String category = newArticleData.getString("category");
            topic.put("category",category);

            // put in modified topic words
            JSONObject modifiedTopicWords = newArticleData.getJSONObject("topicWordsFreq");
            topic.put("modifiedTopicWords",modifiedTopicWords);
            newArticleData.remove("topicWordsFreq");
            newArticleData.remove("success");

            // add thumbsUp and thumbsDown flags
            newArticleData.put("thumbsUp",false);
            newArticleData.put("thumbsDown",false);

            // create timeline
            JSONArray timeline = new JSONArray();
            timeline.put(newArticleData);
            topic.put("timeline",timeline);

            Log.d("CA","Final topic: " + topic.toString(4));

            if(userData.has("topics")) {
                JSONArray topics = ValuesAndUtil.getInstance().addToExistingJSON(userData.getJSONArray("topics"),0,topic);
                userData.put("topics",topics);
            } else {
                JSONArray topics = new JSONArray();
                topics.put(topic);
                userData.put("topics",topics);
            }

            if(userData.has("interests")) {
                JSONObject currInterests = userData.getJSONObject("interests");
                JSONObject newInterests = ValuesAndUtil.getInstance().addToInterests(currInterests,topicWords);
                userData.put("interests", newInterests);
            } else {
                JSONObject interests = ValuesAndUtil.getInstance().addToInterests(new JSONObject(),topicWords);
                userData.put("interests", interests);
            }

            ValuesAndUtil.getInstance().saveUserData(userData,getApplicationContext());
            Log.d("CA","Done with this! Saved!");
            Intent intent = new Intent(this,NewsHomeScreen.class);
            startActivity(intent);
            finish();
        } catch (JSONException e) {
            Log.e("CA","CAUGHT JSONEXCEPTION: " + e.getMessage());
            e.printStackTrace();
        }
    }
}
