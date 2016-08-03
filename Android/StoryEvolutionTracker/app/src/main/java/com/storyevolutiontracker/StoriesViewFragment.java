package com.storyevolutiontracker;

import android.app.Fragment;
import android.os.AsyncTask;
import android.os.Bundle;
import android.os.Handler;
import android.support.v4.widget.SwipeRefreshLayout;
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

import java.io.UnsupportedEncodingException;
import java.net.URLEncoder;

public class StoriesViewFragment extends Fragment implements SwipeRefreshLayout.OnRefreshListener {

    private JSONObject user;
    private JSONArray topics;
    private RecyclerView mRecyclerView;
    private RecyclerView.Adapter mAdapter;
    private RecyclerView.LayoutManager mLayoutManager;
    private SwipeRefreshLayout swipeLayout;
    private final String getNextArticlePostUrl = "http://139.59.167.170:3000/get_next_article";

    @Override
    public View onCreateView(LayoutInflater inflater, ViewGroup container,
                             Bundle savedInstanceState) {
        View rootView = inflater.inflate(R.layout.fragment_stories_view, container, false);
        getActivity().setTitle(getResources().getString(R.string.title_activity_news_home_screen));

        swipeLayout = (SwipeRefreshLayout) rootView.findViewById(R.id.swipe_refresh_layout);
        swipeLayout.setOnRefreshListener(this);

        TextView noTopicsText = (TextView) rootView.findViewById(R.id.no_topics_textview);
        SwipeRefreshLayout srl = (SwipeRefreshLayout) rootView.findViewById(R.id.swipe_refresh_layout);
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
            srl.setVisibility(View.INVISIBLE);
        } else {
            Log.d("SVF","Topics were not null");
            srl.setVisibility(View.VISIBLE);
            try {
                topics = user.getJSONArray("topics");
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

    @Override
    public void onRefresh() {
        refreshAllStories();
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
                Log.d("SVF","Would send: " + urlParams);
                new DownloadNextArticleData().execute(urlParams,Integer.toString(i));
            }
            ValuesAndUtil.getInstance().saveUserData(user,this.getActivity());
            mAdapter.notifyDataSetChanged();
            swipeLayout.setRefreshing(false);
        } catch (JSONException e) {
            e.printStackTrace();
        }


        // for each topic, do post request for new stories

        // if found = true, add
    }

    private class DownloadNextArticleData extends AsyncTask<String, Void, String> {

        private String id;

        @Override
        protected String doInBackground(String... strings) {
            id = strings[1];
            return ValuesAndUtil.getInstance().doPostRequest(getNextArticlePostUrl,strings[0]);
        }

        @Override
        protected void onPostExecute(String s) {
            Log.d("ANS","DONE! " + s);
            addNewArticleToUser(s,Integer.parseInt(id));
        }
    }

    public void addNewArticleToUser(String data, int articleId) {
        Log.d("SVF","Modifying topic " + articleId);
        try {
            JSONObject article = new JSONObject(data);
            boolean found = article.getBoolean("found");
            if(found) {
                // update topic with new article; don't do anything if not found
                article.remove("found");
                JSONObject topic = topics.getJSONObject(articleId);
                JSONArray timeline = topic.getJSONArray("timeline");
                timeline = ValuesAndUtil.getInstance().addToExistingJSON(timeline,0,article);
                topic.put("timeline",timeline);
                topic.put("lastTimeStamp",article.getLong("date"));
                topic.put("lastSignature",article.getString("signature"));
                topics.put(articleId,topic);
                user.put("topics",topic);
            }
        } catch (JSONException e) {
            e.printStackTrace();
            return;
        }
    }
}
