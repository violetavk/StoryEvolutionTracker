package com.storyevolutiontracker.util;

import android.content.Context;
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
import java.net.HttpURLConnection;
import java.net.MalformedURLException;
import java.net.URL;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.Date;
import java.util.Iterator;
import java.util.LinkedHashMap;
import java.util.LinkedList;
import java.util.List;
import java.util.Map;

public class ValuesAndUtil {

    /* GLOBAL VALUES  */
    public final static String USER_DATA_FILE = "user_data";
    public final static String NEW_ARTICLE_DATA = "com.storyevolutiontracker.NEWARTICLEDATA";

    public final static String SERVER_PROCESS_ARTICLE_URL = "http://139.59.167.170:3000/process_article";
    public final static String SERVER_NEW_ARTICLES_URL = "http://139.59.167.170:3000/get_next_article";

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
            Log.d("VAU","Loaded user data: " + sb.toString());
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
            Log.d("VAU","Saved user data: " + userData);
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
        long diffDays = difference / (24 * 60 * 60 * 1000);
        if(diffDays == 0) {
            if(diffHours == 0) {
                long diffMinutes = difference / (60 * 1000) % 60;
                return diffMinutes + " minutes ago";
            }
            if(diffHours == 1) {
                return "1 hour ago";
            }
            if(diffHours <= 12) {
                return diffHours + " hours ago";
            }
        }
        SimpleDateFormat simpleDateFormat = new SimpleDateFormat("EEE, MMMM dd, yyyy HH:mm");
        return simpleDateFormat.format(date);
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

    public String doPostRequest(String serverURL, String urlParameters) {
        try {
            URL obj = new URL(serverURL);
            HttpURLConnection con = (HttpURLConnection) obj.openConnection();
            con.setRequestMethod("POST");
            con.setDoOutput(true);
            con.setFixedLengthStreamingMode(urlParameters.getBytes().length);
            con.setRequestProperty("Cache-Control","no-cache");
            con.setRequestProperty("Content-Type", "application/x-www-form-urlencoded");
            Log.d("ANS",urlParameters);

            // Send post request
            OutputStreamWriter outputStreamWriter = new OutputStreamWriter(con.getOutputStream());
            outputStreamWriter.write(urlParameters);
            outputStreamWriter.flush();
            outputStreamWriter.close();

            int responseCode = con.getResponseCode();
            Log.d("VAU","\nSending 'POST' request to URL : " + serverURL);
            Log.d("VAU","Post parameters : " + urlParameters);
            Log.d("VAU","Response Code : " + responseCode);

            BufferedReader in = new BufferedReader(new InputStreamReader(con.getInputStream()));
            String inputLine;
            StringBuilder response = new StringBuilder();

            while ((inputLine = in.readLine()) != null) {
                response.append(inputLine);
            }
            in.close();

            return response.toString();
        } catch (MalformedURLException e) {
            e.printStackTrace();
        } catch (IOException e) {
            e.printStackTrace();
            return "IOException";
        }
        return null;
    }

    public JSONObject sortByValue(JSONObject original) throws JSONException {
        Iterator<String> keys = original.keys();
        Map<String,Integer> originalMap = new LinkedHashMap<>();
        while(keys.hasNext()) {
            String key = keys.next();
            originalMap.put(key,original.getInt(key));
        }
        List<Map.Entry<String,Integer>> list = new LinkedList<>(originalMap.entrySet());
        Collections.sort(list, new Comparator<Map.Entry<String, Integer>>() {
            @Override
            public int compare(Map.Entry<String, Integer> o1, Map.Entry<String, Integer> o2) {
                return ( o2.getValue() ).compareTo( o1.getValue() );
            }
        });
        Map<String,Integer> sortResult = new LinkedHashMap<>();
        for (int i = 0; i < list.size(); i++) {
            Map.Entry<String,Integer> entry = list.get(i);
            sortResult.put( entry.getKey(), entry.getValue() );
        }
        return new JSONObject(sortResult);
    }

    public boolean articleAlreadyExists(JSONObject article, JSONArray topics, int articleId) throws JSONException {
        String newArticleSignature = article.getString("signature").trim();
        JSONArray timeline = topics.getJSONObject(articleId).getJSONArray("timeline");
        for(int i = 0; i < timeline.length(); i++) {
            JSONObject currArticle = timeline.getJSONObject(i);
            String currArticleSignature = currArticle.getString("signature").trim();
            if(currArticleSignature.equals(newArticleSignature)) {
                return true;
            }
        }
        return false;
    }

    public JSONArray sortTopicsArray(JSONArray topics) throws JSONException {
        List<JSONObject> list = new ArrayList<>();
        for(int i = 0; i < topics.length(); i++) {
            list.add(topics.getJSONObject(i));
        }
        Collections.sort(list, new Comparator<JSONObject>() {
            @Override
            public int compare(JSONObject o1, JSONObject o2) {
                try {
                    Long t1 = o1.getLong("lastUpdated");
                    Long t2 = o2.getLong("lastUpdated");
                    return t2.compareTo(t1);
                } catch (JSONException e) {
                    e.printStackTrace();
                }
                return 0;
            }
        });
        Log.d("SVF","Sorted topics: " + list);
        return new JSONArray(list);
    }

    public JSONObject addToInterests(JSONObject interests, JSONArray topicWords) {
        try {
            for(int i = 0; i < topicWords.length(); i++) {
                String curr = topicWords.getString(i);
                if(interests.has(curr)) {
                    // increment
                    int value = interests.getInt(curr) + 1;
                    interests.put(curr, value);
                } else {
                    // create new
                    interests.put(curr, 1);
                }
            }
            JSONObject sortedInterests = sortByValue(interests);
            return sortedInterests;
        } catch (JSONException e) {
            e.printStackTrace();
        }
        return interests;
    }
}
