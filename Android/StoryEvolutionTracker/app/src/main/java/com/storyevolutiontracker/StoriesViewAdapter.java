package com.storyevolutiontracker;

import android.support.v7.widget.RecyclerView;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.TextView;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

/**
 * Created by violet on 01/08/2016.
 */
public class StoriesViewAdapter extends RecyclerView.Adapter<StoriesViewAdapter.ViewHolder> {

    private JSONArray topics;

    public static class ViewHolder extends RecyclerView.ViewHolder {
        public View view;
        public ViewHolder(View v) {
            super(v);
            view = v;
        }
    }

    public StoriesViewAdapter(JSONArray topics) {
        this.topics = topics;
    }

    @Override
    public StoriesViewAdapter.ViewHolder onCreateViewHolder(ViewGroup parent, int viewType) {
        View v = LayoutInflater.from(parent.getContext()).inflate(R.layout.story_card, parent, false);
        ViewHolder vh = new ViewHolder(v);
        return vh;
    }

    @Override
    public void onBindViewHolder(StoriesViewAdapter.ViewHolder holder, int position) {
        View view = holder.view;
        TextView infotext = (TextView) view.findViewById(R.id.signature_text_card);
        TextView lastUpdated = (TextView) view.findViewById(R.id.last_updated_card);

        try {
            JSONObject topic = topics.getJSONObject(position);
            String signature = topic.getString("lastSignature");
            infotext.setText(signature);
            long lastTimestamp = topic.getLong("lastTimeStamp");
            lastUpdated.setText("Last updated: " + ValuesAndUtil.getInstance().formatDate(lastTimestamp));
        } catch (JSONException e) {
            e.printStackTrace();
        }

//        holder.mTextView.setText(mDataset[position]);
    }

    @Override
    public int getItemCount() {
        return topics.length();
    }
}
