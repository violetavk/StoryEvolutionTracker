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

import com.storyevolutiontracker.util.RoundedBackgroundSpan;
import com.storyevolutiontracker.util.ValuesAndUtil;
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
            if(isThumbsUp) thumbsUp.setColorFilter(R.color.Aqua);
            if(position == timeline.length() - 1) thumbsUp.setVisibility(View.INVISIBLE);

            // deal with thumbs down
            final ImageButton thumbsDown = (ImageButton) view.findViewById(R.id.story_thumbsdown);
            boolean isThumbsDown = story.getBoolean("thumbsDown");
            if(isThumbsDown) thumbsDown.setColorFilter(R.color.Aqua);
            if(position == timeline.length() - 1) thumbsDown.setVisibility(View.INVISIBLE);

            thumbsUp.setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View view) {
                    try {
                        JSONObject curr = (JSONObject) timeline.get(position);
                        curr = doThumbsUp(curr, thumbsUp, thumbsDown,view);
                        timeline.put(position,curr);
                        JSONObject user = ValuesAndUtil.getInstance().loadUserData(view.getContext());
                        topic = user.getJSONArray("topics").getJSONObject(topicPosition);
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

            thumbsDown.setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View view) {
                    try {
                        JSONObject curr = (JSONObject) timeline.get(position);
                        curr = doThumbsDown(curr, thumbsUp, thumbsDown, view);
                        timeline.put(position,curr);
                        JSONObject user = ValuesAndUtil.getInstance().loadUserData(view.getContext());
                        topic = user.getJSONArray("topics").getJSONObject(topicPosition);
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

        } catch (JSONException e) {
            e.printStackTrace();
        }
    }

    public JSONObject doThumbsUp(JSONObject story, ImageButton btnUp, ImageButton btnDown, View view) throws JSONException {
        Log.d("TVA","Clicked thumbs up");
        if(story.getBoolean("thumbsUp")) {
            // thumbs up was already pressed, but it was clicked again, so revert back to original
            modifyPoints(story,view,false);
            story.put("thumbsUp",false);
            btnUp.clearColorFilter();
        } else {
            // thumbs up pressed, increase weight of topic words
            modifyPoints(story,view,true);
            story.put("thumbsUp",true);
            btnUp.setColorFilter(R.color.Aqua);
            // check if thumbsDown, and do twice the addition
            if(story.getBoolean("thumbsDown")) {
                modifyPoints(story, view,true);
                story.put("thumbsDown",false);
                btnDown.clearColorFilter();
            }
        }
        return story;
    }

    public JSONObject doThumbsDown(JSONObject story, ImageButton btnUp, ImageButton btnDown, View view) throws JSONException {
        Log.d("TVA","Clicked thumbs up");
        if(story.getBoolean("thumbsDown")) {
            // thumbs down was already pressed, but it was clicked again, so revert back to original
            modifyPoints(story,view,true);
            story.put("thumbsDown",false);
            btnDown.clearColorFilter();
        } else {
            // thumbs up pressed, increase weight of topic words
            modifyPoints(story,view,false);
            story.put("thumbsDown",true);
            btnDown.setColorFilter(R.color.Aqua);

            // check if thumbsDown, and do twice the deduction
            if(story.getBoolean("thumbsUp")) {
                modifyPoints(story,view,false);
                story.put("thumbsUp",false);
                btnUp.clearColorFilter();
            }
        }
        return story;
    }

    public void modifyPoints(JSONObject story, View view, boolean toAdd) throws JSONException {
        JSONObject user = ValuesAndUtil.getInstance().loadUserData(view.getContext());
        JSONArray topics = user.getJSONArray("topics");
        JSONObject topic = topics.getJSONObject(topicPosition);
        JSONObject modifiedTopicWords = topic.getJSONObject("modifiedTopicWords");
        JSONArray currTopicWords = story.getJSONArray("topicWords");
        for(int i = 0; i < currTopicWords.length(); i++) {
            String currWord = currTopicWords.getString(i);
            int num = 0;
            if(toAdd) {
                num = currTopicWords.length() - i; // the amount to add
            } else {
                num = (currTopicWords.length() - i) * -1; // the amount to subtract
            }
            if(modifiedTopicWords.has(currWord)) {
                int currValue = modifiedTopicWords.getInt(currWord);
                currValue = currValue + (num);
                modifiedTopicWords.put(currWord,currValue);
            } else {
                modifiedTopicWords.put(currWord,num);
            }
        }
        modifiedTopicWords = ValuesAndUtil.getInstance().sortByValue(modifiedTopicWords);
        topic.put("modifiedTopicWords",modifiedTopicWords);
        topics.put(topicPosition,topic);
        user.put("topics",topics);
        ValuesAndUtil.getInstance().saveUserData(user,view.getContext());
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