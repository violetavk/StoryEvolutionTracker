package com.storyevolutiontracker;

import android.content.Context;
import android.support.v7.app.AppCompatActivity;
import android.util.Log;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.OutputStreamWriter;
import java.io.UnsupportedEncodingException;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;

public class ValuesAndUtil extends AppCompatActivity {

    /* GLOBAL VALUES  */
    public final static String STORED_USER_DATA_EXTRA = "com.storyevolutiontracker.USERDATA";
    public final static String USER_DATA_FILE = "user_data";
    public final static String NEW_ARTICLE_DATA = "com.storyevolutiontracker.NEWARTICLEDATA";
    public final static String TOPIC_FOR_TIMELINE_EXTRA = "com.storyevolutiontracker.TOPICFORTIMELINE";

    private static ValuesAndUtil valuesAndUtil;

    protected ValuesAndUtil() {}

    public static ValuesAndUtil getInstance() {
        if(valuesAndUtil == null)
            valuesAndUtil = new ValuesAndUtil();
        return valuesAndUtil;
    }

    public JSONObject loadUserData(Context context) {
        try {
            FileInputStream fis = context.openFileInput(USER_DATA_FILE);
            InputStreamReader isr = new InputStreamReader(fis, "UTF-8");
            BufferedReader bufferedReader = new BufferedReader(isr);
            StringBuilder sb = new StringBuilder();
            String line;
            while ((line = bufferedReader.readLine()) != null) {
                sb.append(line).append("\n");
            }
            return new JSONObject(sb.toString());
        } catch (FileNotFoundException e) {
            Log.e("Exception", "FileNotFoundException caught: " + e.toString());
        } catch (UnsupportedEncodingException e) {
            Log.e("Exception", "UnsupportedEncodingException caught: " + e.toString());
        } catch (IOException e) {
            Log.e("Exception", "IOException caught: " + e.toString());
        } catch (JSONException e) {
            Log.e("Exception", "JSONException caught: " + e.toString());
        }
        return null;
    }

    public void saveUserData(JSONObject userData, Context context) {
        OutputStreamWriter outputStreamWriter = null;
        try {
            outputStreamWriter = new OutputStreamWriter(context.openFileOutput(ValuesAndUtil.USER_DATA_FILE, Context.MODE_PRIVATE));
            outputStreamWriter.write(userData.toString());
            outputStreamWriter.close();
        } catch (IOException e) {
            Log.e("error","Failed to save user data in ValuesAndUtil file: " + e.getMessage());
        }
    }

    public void deleteUserData(Context context) {
        context.deleteFile(USER_DATA_FILE);
        Log.d("VAU","Deleted all user data");
    }

    public String formatDate(long dateMillis) {
        dateMillis *= 1000;
        Date date = new Date(dateMillis);
        Date now = new Date();
        long difference = now.getTime() - date.getTime();
        long diffHours = difference / (60 * 60 * 1000) % 24;
        if(diffHours <= 12) {
            return diffHours + " hours ago";
        }
        SimpleDateFormat simpleDateFormat = new SimpleDateFormat("EEE, MMMM dd, yyyy HH:mm");
        String dateStr = simpleDateFormat.format(date);
        return dateStr;
    }

    public JSONArray addToExistingJSON(JSONArray existing, int index, JSONObject toAdd) {
        ArrayList<JSONObject> list = new ArrayList<JSONObject>();
        try {
            for (int i = 0; i < existing.length(); i++) {
                list.add((JSONObject) existing.get(i));
            }
            list.add(index, toAdd);

            JSONArray toReturn = new JSONArray();
            for (int i = 0; i < list.size(); i++) {
                toReturn.put(list.get(i));
            }

            return toReturn;

        } catch (JSONException e) {
            e.printStackTrace();
        }
        return null;
    }

}
