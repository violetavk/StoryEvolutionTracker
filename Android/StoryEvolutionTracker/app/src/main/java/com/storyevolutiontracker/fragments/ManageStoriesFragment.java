package com.storyevolutiontracker.fragments;

import android.app.Fragment;
import android.os.Bundle;
import android.support.design.widget.NavigationView;
import android.support.v7.widget.LinearLayoutManager;
import android.support.v7.widget.RecyclerView;
import android.util.Log;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.TextView;

import com.storyevolutiontracker.ManageStoriesAdapter;
import com.storyevolutiontracker.R;
import com.storyevolutiontracker.util.ValuesAndUtil;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

public class ManageStoriesFragment extends Fragment {

    private JSONObject user;
    private JSONArray topics;
    private RecyclerView mRecyclerView;
    private RecyclerView.Adapter mAdapter;
    private RecyclerView.LayoutManager mLayoutManager;
    private NavigationView navigationView;

    @Override
    public View onCreateView(LayoutInflater inflater, ViewGroup container,
                             Bundle savedInstanceState) {

        View rootView = inflater.inflate(R.layout.fragment_manage_stories, container, false);
        getActivity().setTitle("Manage stories");

        mRecyclerView = (RecyclerView) rootView.findViewById(R.id.manage_stories_recycler_view);



        user = ValuesAndUtil.getInstance().loadUserData(rootView.getContext());
        if(!user.has("topics")) {
            TextView noTopicsTV = (TextView) rootView.findViewById(R.id.no_topics_to_manage_textview);
            noTopicsTV.setText(R.string.no_topics_to_manage_text);
            mRecyclerView.setVisibility(View.INVISIBLE);
        } else {
            try {
                topics = user.getJSONArray("topics");
                mRecyclerView.setVisibility(View.VISIBLE);
                mRecyclerView.setHasFixedSize(true);
                mLayoutManager = new LinearLayoutManager(getActivity());
                mRecyclerView.setLayoutManager(mLayoutManager);
                mAdapter = new ManageStoriesAdapter(topics);
                mRecyclerView.setAdapter(mAdapter);
            } catch (JSONException e) {
                e.printStackTrace();
            }
        }

        return rootView;
    }

    @Override
    public void onPause() {
        super.onPause();
        Log.d("MSF","Called onPause in ManageStoriesFragment");
    }

    @Override
    public void onStart() {
        super.onStart();
        Log.d("MSF","Called onStart in ManageStoriesFragment");
        user = ValuesAndUtil.getInstance().loadUserData(getActivity().getApplicationContext());
        try {
            topics = user.getJSONArray("topics");
        } catch (JSONException e) {
            e.printStackTrace();
        }
    }

    public void onResume() {
        super.onResume();
        Log.d("MSF","Called onResume in ManageStoriesFragment");
        user = ValuesAndUtil.getInstance().loadUserData(getActivity().getApplicationContext());

        try {
            if(user.has("topics")) {
                topics = user.getJSONArray("topics");
                mRecyclerView.invalidate();
                JSONArray sortedTopics = ValuesAndUtil.getInstance().sortTopicsArray(user.getJSONArray("topics"));
                user.put("topics",sortedTopics);
                ValuesAndUtil.getInstance().saveUserData(user,getActivity().getApplicationContext());
                mAdapter = new ManageStoriesAdapter(sortedTopics);
                mRecyclerView.setAdapter(mAdapter);
            }
        } catch (JSONException e) {
            e.printStackTrace();
        }
    }

}
