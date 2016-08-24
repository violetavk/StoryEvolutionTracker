package com.storyevolutiontracker.util;

import android.app.IntentService;
import android.app.Notification;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.graphics.BitmapFactory;
import android.os.AsyncTask;
import android.support.v4.app.NotificationCompat;
import android.util.Log;
import android.widget.Toast;

import com.storyevolutiontracker.MainActivity;
import com.storyevolutiontracker.R;
import com.storyevolutiontracker.StoriesViewAdapter;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

/**
 * Created by violet on 08/08/2016.
 */
public class UpdateNewsSchedulingService extends IntentService {

    private int done, numberUpdated;
    private JSONObject user;
    private JSONArray topics;
    private NotificationManager mNotificationManager;
    public static final int NOTIFICATION_ID = 1;
    private Intent intent;

    public UpdateNewsSchedulingService() {
        super("UpdateNewsSchedulingService");
    }

    @Override
    protected void onHandleIntent(Intent intent) {
        user = ValuesAndUtil.getInstance().loadUserData(getApplicationContext());
        if(user == null)
            return;
        done = 0;
        numberUpdated = 0;
        this.intent = intent;
        try {
            if(user.has("topics") && user.getJSONArray("topics").length() > 0) {
                try {
                    topics = user.getJSONArray("topics");
                    refreshAllStories();
                } catch (JSONException e) {
                    e.printStackTrace();
                }
            } else {
                UpdateNewsReceiver.completeWakefulIntent(intent);
            }
        } catch (JSONException e) {
            e.printStackTrace();
        }
    }

    public void refreshAllStories() throws JSONException {
        for(int i = 0; i < topics.length(); i++) {
            JSONObject topic = topics.getJSONObject(i);
            JSONArray topicWords = topic.getJSONObject("modifiedTopicWords").names();
            String urlParams = "";
            for(int j = 0; j < topicWords.length(); j++) {
                String curr = topicWords.getString(j);
                curr = curr.replaceAll("\\s+","+");
                urlParams += ("words=" + curr + "&");
            }
            long timestamp = topic.getLong("lastTimeStamp");
            urlParams += ("timestamp=" + timestamp);
            String category = topic.getString("category");
            urlParams += ("&category="+category);
            Log.d("UNSS","Would send: " + urlParams);
            new DownloadNextArticleData().execute(urlParams,Integer.toString(i));
        }
    }

    private class DownloadNextArticleData extends AsyncTask<String, Void, String> {

        private String id;

        @Override
        protected String doInBackground(String... strings) {
            id = strings[1];
            return ValuesAndUtil.getInstance().doPostRequest(ValuesAndUtil.SERVER_NEW_ARTICLES_URL,strings[0]);
        }

        @Override
        protected void onPostExecute(String s) {
            Log.d("UNSS","DONE! " + s);
            doAfterPostSuccess(s,Integer.parseInt(id));
        }
    }

    public void doAfterPostSuccess(String s, int articleId) {
        if(s == "IOException") {
            Log.d("UNSS","Failed getting new articles");
            return;
        }
        addNewArticleToUser(s,articleId);
        done++;
        Log.d("UNSS","Done " + done + " out of " + topics.length());
        if(done == topics.length()) {
            ValuesAndUtil.getInstance().saveUserData(user,getApplicationContext());
            Log.d("UNSS","Finished updating all articles (using alarm)");
            UpdateNewsReceiver.completeWakefulIntent(intent);
        }
    }

    public void addNewArticleToUser(String data, int articleId) {
        Log.d("UNSS","Modifying topic " + articleId);
        try {
            JSONObject article = new JSONObject(data);
            boolean found = article.getBoolean("found");
            if(found) {
                // update topic with new article; don't do anything if not found
                if(!ValuesAndUtil.getInstance().articleAlreadyExists(article,topics,articleId)) {
                    numberUpdated++;
                    article.remove("found");
                    article.put("thumbsUp",false);
                    article.put("thumbsDown",false);
                    JSONObject topic = topics.getJSONObject(articleId);
                    JSONArray timeline = topic.getJSONArray("timeline");
                    timeline = ValuesAndUtil.getInstance().addToExistingJSON(timeline,0,article);
                    topic.put("timeline",timeline);
                    topic.put("lastTimeStamp",article.getLong("date"));
                    topic.put("lastSignature",article.getString("signature"));
                    topic.put("lastUpdated",System.currentTimeMillis());
                    Log.d("SVF",topic.toString(2));
                    topics.put(articleId,topic);
                    user.put("topics",topics);
                    ValuesAndUtil.getInstance().saveUserData(user,getApplicationContext());
                    sendNotification("Update: " + article.getString("signature"));
                }
            }
        } catch (JSONException e) {
            e.printStackTrace();
            return;
        }
    }

    private void sendNotification(String msg) {
        mNotificationManager = (NotificationManager)
                this.getSystemService(Context.NOTIFICATION_SERVICE);

        PendingIntent contentIntent = PendingIntent.getActivity(this, 0,
                new Intent(this, MainActivity.class), 0);

        NotificationCompat.Builder mBuilder = new NotificationCompat.Builder(this)
                .setSmallIcon(R.drawable.news_icon)
                .setLargeIcon(BitmapFactory.decodeResource(getResources(),R.mipmap.ic_launcher))
                .setContentTitle("Story Evolution Tracker")
                .setDefaults(Notification.DEFAULT_ALL)
                .setStyle(new NotificationCompat.BigTextStyle().bigText(msg))
                .setContentText(msg)
                .setAutoCancel(true);

        mBuilder.setContentIntent(contentIntent);
        mNotificationManager.notify(NOTIFICATION_ID, mBuilder.build());
    }

}
