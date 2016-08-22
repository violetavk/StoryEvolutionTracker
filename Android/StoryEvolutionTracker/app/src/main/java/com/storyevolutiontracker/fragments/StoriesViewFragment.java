package com.storyevolutiontracker.fragments;

import android.app.Fragment;
import android.content.Context;
import android.net.ConnectivityManager;
import android.net.NetworkInfo;
import android.os.AsyncTask;
import android.os.Bundle;
import android.support.v4.widget.SwipeRefreshLayout;
import android.support.v7.widget.LinearLayoutManager;
import android.support.v7.widget.RecyclerView;
import android.util.Log;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.TextView;
import android.widget.Toast;

import com.storyevolutiontracker.R;
import com.storyevolutiontracker.StoriesViewAdapter;
import com.storyevolutiontracker.util.ValuesAndUtil;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;

public class StoriesViewFragment extends Fragment implements SwipeRefreshLayout.OnRefreshListener {

    private JSONObject user;
    private JSONArray topics;
    private RecyclerView mRecyclerView;
    private RecyclerView.Adapter mAdapter;
    private RecyclerView.LayoutManager mLayoutManager;
    private SwipeRefreshLayout swipeLayout;
    private int done;

    @Override
    public View onCreateView(LayoutInflater inflater, ViewGroup container,
                             Bundle savedInstanceState) {
        View rootView = inflater.inflate(R.layout.fragment_stories_view, container, false);
        getActivity().setTitle(getResources().getString(R.string.title_activity_news_home_screen));

        swipeLayout = (SwipeRefreshLayout) rootView.findViewById(R.id.swipe_refresh_layout);
        swipeLayout.setOnRefreshListener(this);

        TextView noTopicsText = (TextView) rootView.findViewById(R.id.no_topics_textview);
        user = ValuesAndUtil.getInstance().loadUserData(getActivity().getApplicationContext());

        boolean hasTopics = user.has("topics");
        Log.d("SVF","Has topics = " + hasTopics);
        if(!hasTopics) {
            noTopicsText.setText(getString(R.string.no_topics_available));
            swipeLayout.setVisibility(View.INVISIBLE);
        } else {
            Log.d("SVF","Topics were not null");
            swipeLayout.setVisibility(View.VISIBLE);
            try {
                topics = user.getJSONArray("topics");
                setUpList(rootView,topics);
            } catch (JSONException e) {
                e.printStackTrace();
            }
        }

        return rootView;
    }

    public void setUpList(View rootView, JSONArray topics) throws JSONException {
        Log.d("SVF","Setting up topics list");
        Log.d("SVF",topics.toString());
        mRecyclerView = (RecyclerView) rootView.findViewById(R.id.stories_recycler_view);
        mRecyclerView.setHasFixedSize(true);
        mLayoutManager = new LinearLayoutManager(getActivity());
        mRecyclerView.setLayoutManager(mLayoutManager);
        mAdapter = new StoriesViewAdapter(topics);
        mRecyclerView.setAdapter(mAdapter);
    }

    @Override
    public void onRefresh() {
        ConnectivityManager connMgr = (ConnectivityManager) getActivity().getSystemService(Context.CONNECTIVITY_SERVICE);
        NetworkInfo networkInfo = connMgr.getActiveNetworkInfo();
        if (networkInfo != null && networkInfo.isConnected()) {
            done = 0;
            refreshAllStories();
        } else {
            Toast.makeText(getActivity(),"No Internet connection available",Toast.LENGTH_SHORT).show();
            swipeLayout.setRefreshing(false);
        }
    }

    public void refreshAllStories() {
        // get all topics
        if(!user.has("topics")) {
            swipeLayout.setRefreshing(false);
            return;
        }

        try {
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
                Log.d("SVF","Would send: " + urlParams);
                new DownloadNextArticleData().execute(urlParams,Integer.toString(i));
            }
            Log.d("SVF","Done updating all articles");
        } catch (JSONException e) {
            e.printStackTrace();
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
            Log.d("ANS","DONE! " + s);
            doAfterPostSuccess(s,Integer.parseInt(id));
        }
    }

    public void addNewArticleToUser(String data, int articleId) {
        Log.d("SVF","Modifying topic " + articleId);
        try {
            JSONObject article = new JSONObject(data);
            boolean found = article.getBoolean("found");
            if(found) {
                // update topic with new article; don't do anything if not found
                if(!ValuesAndUtil.getInstance().articleAlreadyExists(article,topics,articleId)) {
                    article.remove("found");
                    article.put("thumbsUp",false);
                    article.put("thumbsDown",false);
                    JSONObject topic = topics.getJSONObject(articleId);
                    JSONArray timeline = topic.getJSONArray("timeline");
                    timeline = ValuesAndUtil.getInstance().addToExistingJSON(timeline,0,article);
                    topic.put("timeline",timeline);
                    topic.put("lastTimeStamp",article.getLong("date"));
                    topic.put("lastSignature",article.getString("signature"));
                    Log.d("SVF",topic.toString(2));
                    topics.put(articleId,topic);
                    user.put("topics",topics);
                    ValuesAndUtil.getInstance().saveUserData(user,getActivity().getApplicationContext());
                    mAdapter.notifyItemChanged(articleId);
                }
            }
        } catch (JSONException e) {
            e.printStackTrace();
        }
    }

    public void doAfterPostSuccess(String s, int articleId) {
        if(s.equals("IOException")) {
            Toast.makeText(getActivity().getApplicationContext(),"Server not available, please contact application owner",Toast.LENGTH_SHORT).show();
            mAdapter.notifyDataSetChanged();
            swipeLayout.setRefreshing(false);
            return;
        }
        addNewArticleToUser(s,articleId);
        done++;
        Log.d("SVF","Done " + done + " out of " + topics.length());
        if(done == topics.length()) {
            swipeLayout.setRefreshing(false);
            ValuesAndUtil.getInstance().saveUserData(user,getActivity().getApplicationContext());
            try {
                JSONArray sortedTopics = ValuesAndUtil.getInstance().sortTopicsArray(user.getJSONArray("topics"));
                user.put("topics",sortedTopics);
                ValuesAndUtil.getInstance().saveUserData(user,getActivity().getApplicationContext());
                mAdapter = new StoriesViewAdapter(sortedTopics);
            } catch (JSONException e) {
                e.printStackTrace();
            }
            mRecyclerView.setAdapter(mAdapter);
            Log.d("SVF","Finished updating all articles");
        }
    }

    @Override
    public void onPause() {
        super.onPause();
        Log.d("SVF","Called onPause in StoriesViewFragment");
        ValuesAndUtil.getInstance().saveUserData(user,getActivity().getApplicationContext());
    }

    @Override
    public void onStart() {
        super.onStart();
        Log.d("SVF","Called onStart in StoriesViewFragment");
        user = ValuesAndUtil.getInstance().loadUserData(getActivity().getApplicationContext());
        topics = user.optJSONArray("topics");
    }

    public void onResume() {
        super.onResume();
        Log.d("SVF","Called onResume in StoriesViewFragment");
        user = ValuesAndUtil.getInstance().loadUserData(getActivity().getApplicationContext());

        try {
            if(user.has("topics")) {
                topics = user.getJSONArray("topics");
                mRecyclerView.invalidate();
                JSONArray sortedTopics = ValuesAndUtil.getInstance().sortTopicsArray(user.getJSONArray("topics"));
                user.put("topics",sortedTopics);
                ValuesAndUtil.getInstance().saveUserData(user,getActivity().getApplicationContext());
                mAdapter = new StoriesViewAdapter(sortedTopics);
                mRecyclerView.setAdapter(mAdapter);
            }
        } catch (JSONException e) {
            e.printStackTrace();
        }
    }
}
