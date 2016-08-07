package com.storyevolutiontracker;

import android.content.Intent;
import android.net.Uri;
import android.support.v7.widget.CardView;
import android.support.v7.widget.RecyclerView;
import android.text.Spannable;
import android.text.SpannableStringBuilder;
import android.util.Log;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.ImageButton;
import android.widget.TextView;

import com.vipul.hp_hp.timelineview.TimelineView;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

public class TimelineViewAdapter extends RecyclerView.Adapter<TimelineViewAdapter.ViewHolder> {

    private JSONObject topic;
    private JSONArray timeline;
    private int topicPosition;

    public TimelineViewAdapter(JSONObject topic, int topicPosition) {
        this.topic = topic;
        this.topicPosition = topicPosition;
        try {
            timeline = topic.getJSONArray("timeline");
        } catch (JSONException e) {
            e.printStackTrace();
        }
    }

    public static class ViewHolder extends RecyclerView.ViewHolder {
        public TimelineView mTimelineView;
        public CardView cardView;

        public ViewHolder(View itemView, int viewType) {
            super(itemView);
            mTimelineView = (TimelineView) itemView.findViewById(R.id.time_marker);
            mTimelineView.initLine(viewType);
            cardView = (CardView) itemView.findViewById(R.id.timeline_card);
        }
    }

    @Override
    public ViewHolder onCreateViewHolder(ViewGroup parent, int viewType) {
        View view = View.inflate(parent.getContext(), R.layout.item_timeline, null);
        return new ViewHolder(view, viewType);
    }

    @Override
    public void onBindViewHolder(ViewHolder holder, final int position) {
        try {
            Log.d("TVA","Binding for " + position);
            JSONObject story = (JSONObject) timeline.get(position);
            CardView view = holder.cardView;
            Log.d("TVA",story.toString(2));

            // show the date published
            TextView dateView = (TextView) view.findViewById(R.id.date_view_timeline);
            dateView.setText(ValuesAndUtil.getInstance().formatDate(story.getLong("date")));

            // show the signature
            TextView signatureText = (TextView) view.findViewById(R.id.signature_timeline);
            signatureText.setText(story.getString("signature"));

            // show the topic words
            TextView topicWordsTextView = (TextView) view.findViewById(R.id.topicwords_timeline);
            JSONArray topicWords = story.getJSONArray("topicWords");
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
            topicWordsTextView.setText(ssb);

            // based on article button
            TextView originalSrcView = (TextView) view.findViewById(R.id.based_on_timeline);
            String headline = "Based on \"" + story.getString("headline") + "\"";
            originalSrcView.setText(headline);

            // view online button
            Button viewOnline = (Button) view.findViewById(R.id.view_online_button_timeline);
            final String url = story.getString("link");
            viewOnline.setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View view) {
                    Intent browserIntent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                    view.getContext().startActivity(browserIntent);
                }
            });

            // deal with thumbs up
            final ImageButton thumbsUp = (ImageButton) view.findViewById(R.id.story_thumbsup);
            boolean isThumbsUp = story.getBoolean("thumbsUp");
            if(isThumbsUp) {
                thumbsUp.setColorFilter(R.color.Aqua);
                Log.d("TVA","Has a thumbs up so setting the color filter");
            } else {
                Log.d("TVA","isThumbsUp was false");
            }
            thumbsUp.setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View view) {
                    try {
                        JSONObject curr = (JSONObject) timeline.get(position);
                        boolean isThumbsUp = curr.getBoolean("thumbsUp");
                        curr = doThumbsUp(curr, isThumbsUp, thumbsUp);
                        timeline.put(position,curr);
                        JSONObject user = ValuesAndUtil.getInstance().loadUserData(view.getContext());
                        topic.put("timeline",timeline);
                        JSONArray allTopics = user.getJSONArray("topics");
                        allTopics.put(topicPosition,topic);
                        user.put("topics",allTopics);
                        ValuesAndUtil.getInstance().saveUserData(user,view.getContext());
                    } catch (JSONException e) {
                        e.printStackTrace();
                    }
                }
            });

            // deal with thumbs down
            final ImageButton thumbsDown = (ImageButton) view.findViewById(R.id.story_thumbsdown);
            thumbsDown.setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View view) {
                    Log.d("TVA","Clicked thumbs down");
                    thumbsDown.setColorFilter(R.color.Aqua);
                }
            });

        } catch (JSONException e) {
            e.printStackTrace();
        }
    }

    public JSONObject doThumbsUp(JSONObject story, boolean isThumbsUp, ImageButton btn) throws JSONException {
        Log.d("TVA","Clicked thumbs up");
        if(isThumbsUp) {
            // thumbs up was already pressed, but it was clicked again, so revert back to original
            story.put("thumbsUp",false);
            btn.clearColorFilter();
        } else {
            // thumbs up pressed, increase weight of topic words
            story.put("thumbsUp",true);
            btn.setColorFilter(R.color.Aqua);
        }
        return story;
    }

    @Override
    public int getItemCount() {
        return timeline.length();
    }

    @Override
    public int getItemViewType(int position) {
        return TimelineView.getTimeLineViewType(position,getItemCount());
    }
}