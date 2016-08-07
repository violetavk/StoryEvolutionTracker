package com.storyevolutiontracker;

import android.support.v7.app.AppCompatActivity;
import android.os.Bundle;
import android.support.v7.widget.LinearLayoutManager;
import android.support.v7.widget.RecyclerView;
import android.util.Log;
import android.view.View;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

public class ViewTimeline extends AppCompatActivity {

    private JSONObject topic;
    private int position;
    private RecyclerView mRecyclerView;
    private RecyclerView.Adapter mAdapter;
    private RecyclerView.LayoutManager mLayoutManager;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        Log.d("VT","onCreate in ViewTimeline");
        setContentView(R.layout.activity_view_timeline);
        this.setTitle(getString(R.string.timeline_label));
        try {
            this.position = getIntent().getExtras().getInt("position");
            topic = ValuesAndUtil.getInstance().loadUserData(getApplicationContext()).getJSONArray("topics").getJSONObject(position);
        } catch (JSONException e) {
            e.printStackTrace();
            return;
        }

        // test
        JSONObject usr = ValuesAndUtil.getInstance().loadUserData(getApplicationContext());
        try {
            Log.d("VT",usr.toString(2));
        } catch (JSONException e) {
            e.printStackTrace();
        }

        mRecyclerView = (RecyclerView) findViewById(R.id.timeline_recycler_view);
        mRecyclerView.setHasFixedSize(true);
        mLayoutManager = new LinearLayoutManager(this);
        mRecyclerView.setLayoutManager(mLayoutManager);
        mAdapter = new TimelineViewAdapter(topic,position);
        mRecyclerView.setAdapter(mAdapter);
    }

    @Override
    protected void onPause() {
        super.onPause();
        Log.d("VT","Did onPause in ViewTimeline");
    }

    @Override
    protected void onResume() {
        super.onResume();
        Log.d("VT","Did onResume in ViewTimeline");
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        Log.d("VT","Did onDestroy in ViewTimeline");
    }
}
