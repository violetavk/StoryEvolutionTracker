package com.storyevolutiontracker;

import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
import android.net.ConnectivityManager;
import android.net.NetworkInfo;
import android.os.AsyncTask;
import android.support.design.widget.Snackbar;
import android.support.v7.app.AppCompatActivity;
import android.os.Bundle;
import android.text.Editable;
import android.util.Log;
import android.view.View;
import android.view.inputmethod.InputMethodManager;
import android.widget.EditText;
import android.widget.Toast;

import java.io.BufferedReader;
import java.io.DataOutputStream;
import java.io.IOException;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.MalformedURLException;
import java.net.URL;
import java.net.URLEncoder;

public class AddNewStory extends AppCompatActivity {

    private final String processArticlePostURL = "http://139.59.167.170:3000/process_article";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_add_new_story);

        // show keyboard on start
        EditText yourEditText= (EditText) findViewById(R.id.url_field);
        InputMethodManager imm = (InputMethodManager) getSystemService(Context.INPUT_METHOD_SERVICE);
        imm.showSoftInput(yourEditText, InputMethodManager.SHOW_IMPLICIT);

    }

    public void onPasteClick(View view) {
        ClipboardManager clipboard = (ClipboardManager) getSystemService(Context.CLIPBOARD_SERVICE);
        String pasteData = "";
        ClipData.Item item = clipboard.getPrimaryClip().getItemAt(0);
        if(clipboard.hasPrimaryClip() && clipboard.getPrimaryClipDescription().hasMimeType("text/plain")) {
            Log.d("debug","Pasting from clipboard");
            pasteData = item.getText().toString();
            Log.d("debug","Found in clipboard: " + pasteData);
            EditText et = (EditText) findViewById(R.id.url_field);
            if(et != null) {
                et.setText(pasteData);
            }
        }
    }


    public void onBeginTrackingClick(View view) {
        /*** START: error checking ***/
        EditText et = (EditText) findViewById(R.id.url_field);
        Editable editable = et.getText();
        if(editable.length() == 0) {
            Snackbar.make(view,"The URL field cannot be empty.",Snackbar.LENGTH_SHORT).show();
            return;
        }
        String text = editable.toString().toLowerCase().trim();

        // check if source is bbc
        if(!text.contains("bbc.co.uk")) {
            Snackbar.make(view,"The article must be from the BBC (bbc.co.uk)",Snackbar.LENGTH_SHORT).show();
            return;
        }
        if(!text.contains("bbc.co.uk/news") && !text.contains("bbc.co.uk/sport")) {
            Snackbar.make(view,"The article must be either BBC News or BBC Sport",Snackbar.LENGTH_SHORT).show();
            return;
        }
        // check if in the correct form
        int indexOfHttp = text.indexOf("http:");
        int indexOfWww = text.indexOf("www.");
        if(indexOfHttp < 0) {
            if(indexOfWww < 0) {
                Snackbar.make(view,"The entered URL has an improper form.",Snackbar.LENGTH_SHORT).show();
                return;
            }
        } else if(indexOfHttp > 0) {
            text = text.substring(indexOfHttp);
        }
        /*** END: error checking ***/

        Toast.makeText(getApplicationContext(),"Extracted URL: " + text,Toast.LENGTH_LONG).show();
        processURL(text);
    }

    public void processURL(String url) {
        Log.d("ANS","Processing url: " + url);

        ConnectivityManager connMgr = (ConnectivityManager)
                getSystemService(Context.CONNECTIVITY_SERVICE);
        NetworkInfo networkInfo = connMgr.getActiveNetworkInfo();
        if (networkInfo != null && networkInfo.isConnected()) {
            // fetch data
            new DownloadArticleData().execute(url);
        } else {
            Snackbar.make(getCurrentFocus(),"No Internet Connection available.",Snackbar.LENGTH_SHORT).show();
            return;
        }
    }

    private class DownloadArticleData extends AsyncTask<String, Void, String> {
        @Override
        protected String doInBackground(String... strings) {
            return doPost(strings[0]);
        }

        @Override
        protected void onPostExecute(String s) {
            Log.d("ANS","DONE! " + s);
//            super.onPostExecute(s);
            // TODO perhaps something with Intents to a YOUR STORY screen and a confirm screen maybe
        }
    }

    public String doPost(String url) {
        try {
            URL obj = new URL(processArticlePostURL);
            HttpURLConnection con = (HttpURLConnection) obj.openConnection();
            con.setRequestMethod("POST");
            con.setRequestProperty("Cache-Control","no-cache");
            con.setRequestProperty("Content-Type", "application/x-www-form-urlencoded");
            String encodedURL = URLEncoder.encode(url,"UTF-8");
            String urlParameters = "url_field=" + encodedURL + "&prod=true";
            Log.d("ANS",urlParameters);

            // Send post request
            con.setDoOutput(true);
            DataOutputStream wr = new DataOutputStream(con.getOutputStream());
            wr.writeBytes(urlParameters);
            wr.flush();
            wr.close();

            int responseCode = con.getResponseCode();
            Log.d("ANS","\nSending 'POST' request to URL : " + url);
            Log.d("ANS","Post parameters : " + urlParameters);
            Log.d("ANS","Response Code : " + responseCode);

            BufferedReader in = new BufferedReader(
                    new InputStreamReader(con.getInputStream()));
            String inputLine;
            StringBuffer response = new StringBuffer();

            while ((inputLine = in.readLine()) != null) {
                response.append(inputLine);
            }
            in.close();

            //print result
            Log.d("ANS",response.toString());
            return response.toString();
        } catch (MalformedURLException e) {
            e.printStackTrace();
        } catch (IOException e) {
            e.printStackTrace();
        }
        return null;
    }
}
