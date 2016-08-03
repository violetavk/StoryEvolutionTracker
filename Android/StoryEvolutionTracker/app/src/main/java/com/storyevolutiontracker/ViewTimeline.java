package com.storyevolutiontracker;

import android.support.v7.app.AppCompatActivity;
import android.os.Bundle;
import android.support.v7.widget.LinearLayoutManager;
import android.support.v7.widget.RecyclerView;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

public class ViewTimeline extends AppCompatActivity {

    private JSONObject topic;
    private RecyclerView mRecyclerView;
    private RecyclerView.Adapter mAdapter;
    private RecyclerView.LayoutManager mLayoutManager;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_view_timeline);
        this.setTitle(getString(R.string.timeline_label));
        try {
            topic = new JSONObject(getIntent().getStringExtra(ValuesAndUtil.TOPIC_FOR_TIMELINE_EXTRA));
        } catch (JSONException e) {
            e.printStackTrace();
            return;
        }

        mRecyclerView = (RecyclerView) findViewById(R.id.timeline_recycler_view);
        mRecyclerView.setHasFixedSize(true);
        mLayoutManager = new LinearLayoutManager(this);
        mRecyclerView.setLayoutManager(mLayoutManager);
        mAdapter = new TimelineViewAdapter(topic);
        mRecyclerView.setAdapter(mAdapter);
    }
}
