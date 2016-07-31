package com.storyevolutiontracker;

import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
import android.support.design.widget.Snackbar;
import android.support.v7.app.AppCompatActivity;
import android.os.Bundle;
import android.text.Editable;
import android.text.InputType;
import android.util.Log;
import android.view.View;
import android.view.inputmethod.InputMethodManager;
import android.widget.EditText;
import android.widget.Toast;

public class AddNewStory extends AppCompatActivity {

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
    }
}
