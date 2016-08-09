package com.storyevolutiontracker;

import android.content.Intent;
import android.support.v7.widget.RecyclerView;
import android.text.Spannable;
import android.text.SpannableStringBuilder;
import android.util.Log;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.TextView;

import com.storyevolutiontracker.util.RoundedBackgroundSpan;
import com.storyevolutiontracker.util.ValuesAndUtil;

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
    public void onBindViewHolder(StoriesViewAdapter.ViewHolder holder, final int position) {
        View view = holder.view;
        TextView infotext = (TextView) view.findViewById(R.id.signature_text_card);
        TextView lastUpdated = (TextView) view.findViewById(R.id.last_updated_card);
        TextView basedOnTopicWords = (TextView) view.findViewById(R.id.based_on_topic_words_textview);
        TextView originalSourceText = (TextView) view.findViewById(R.id.original_source_card);
        Button viewTimelineBtn = (Button) view.findViewById(R.id.view_timeline_btn);
        try {
            final JSONObject topic = ValuesAndUtil.getInstance().loadUserData(view.getContext()).getJSONArray("topics").getJSONObject(position);

            // display signature
            String signature = topic.getString("lastSignature");
            infotext.setText(signature);

            // display last timestamp
            long lastTimestamp = topic.getLong("lastTimeStamp");
            lastUpdated.setText("Last updated: " + ValuesAndUtil.getInstance().formatDate(lastTimestamp));

            // display topic words
            JSONArray topicWords = topic.getJSONObject("modifiedTopicWords").names();
            SpannableStringBuilder ssb = new SpannableStringBuilder();
            for(int i = 0; i < 5 && i < topicWords.length(); i++) {
                String toAdd = " ";
                String word = topicWords.getString(i);
                toAdd += word;
                int length = word.length() + 1 + 1;
                toAdd += "    ";
                Spannable spanText = Spannable.Factory.getInstance().newSpannable(toAdd);
                spanText.setSpan(new RoundedBackgroundSpan(view.getContext()), 0, length, Spannable.SPAN_EXCLUSIVE_EXCLUSIVE);
                ssb.append(spanText);
            }
            basedOnTopicWords.setText(ssb);

            // display original source
            String source = "Because you submitted \"";
            source += topic.getString("originalHeadline");
            source += "\"";
            originalSourceText.setText(source);

            viewTimelineBtn.setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View view) {
                    Log.d("SVA","Clicked " + position);
                    Intent intent = new Intent(view.getContext(),ViewTimeline.class);
                    intent.putExtra("position",position);
                    view.getContext().startActivity(intent);
                }
            });


        } catch (JSONException e) {
            e.printStackTrace();
        }
    }

    @Override
    public int getItemCount() {
        return topics.length();
    }
}
