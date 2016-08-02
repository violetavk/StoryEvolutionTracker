package com.storyevolutiontracker;

import android.app.Fragment;
import android.os.Bundle;
import android.support.v7.widget.LinearLayoutManager;
import android.support.v7.widget.RecyclerView;
import android.util.Log;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.TextView;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

public class StoriesViewFragment extends Fragment {

    private JSONObject user;
    private RecyclerView mRecyclerView;
    private RecyclerView.Adapter mAdapter;
    private RecyclerView.LayoutManager mLayoutManager;

    @Override
    public View onCreateView(LayoutInflater inflater, ViewGroup container,
                             Bundle savedInstanceState) {
        View rootView = inflater.inflate(R.layout.fragment_stories_view, container, false);
        getActivity().setTitle(getResources().getString(R.string.title_activity_news_home_screen));

        TextView noTopicsText = (TextView) rootView.findViewById(R.id.no_topics_textview);

        try {
            user = new JSONObject(getArguments().getCharSequence(ValuesAndUtil.STORED_USER_DATA_EXTRA).toString());
        } catch (JSONException e) {
            Log.e("ERROR","LOADING STORIESVIEWFRAGMENT, BUT NO USER FOUND: " + e.getMessage());
            return rootView;
        }

        boolean hasTopics = user.has("topics");
        Log.d("SVF","Has topics = " + hasTopics);
        if(!hasTopics) {
            noTopicsText.setText(getString(R.string.no_topics_available));
        } else {
            Log.d("SVF","Topics were not null");
            try {
                JSONArray topics = user.getJSONArray("topics");
                setUpList(rootView,topics);
            } catch (JSONException e) {
                e.printStackTrace();
            }
        }


        return rootView;
    }

    public void setUpList(View rootView, JSONArray topics) {
        Log.d("SVF","Setting up topics list");
        Log.d("SVF",topics.toString());
        mRecyclerView = (RecyclerView) rootView.findViewById(R.id.stories_recycler_view);
        mRecyclerView.setHasFixedSize(true);
        mLayoutManager = new LinearLayoutManager(getActivity());
        mRecyclerView.setLayoutManager(mLayoutManager);
        mAdapter = new StoriesViewAdapter(topics);
        mRecyclerView.setAdapter(mAdapter);
    }
}
