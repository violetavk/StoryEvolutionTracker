package com.storyevolutiontracker;

import android.content.Intent;
import android.net.Uri;
import android.support.v7.widget.CardView;
import android.support.v7.widget.RecyclerView;
import android.text.Spannable;
import android.text.SpannableStringBuilder;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.TextView;

import com.vipul.hp_hp.timelineview.TimelineView;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

public class TimelineViewAdapter extends RecyclerView.Adapter<TimelineViewAdapter.ViewHolder> {

    private JSONObject topic;
    private JSONArray timeline;

    public TimelineViewAdapter(JSONObject topic) {
        this.topic = topic;
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
    public void onBindViewHolder(ViewHolder holder, int position) {
        try {
            JSONObject story = (JSONObject) timeline.get(position);
            CardView view = holder.cardView;

            TextView dateView = (TextView) view.findViewById(R.id.date_view_timeline);
            dateView.setText(ValuesAndUtil.getInstance().formatDate(story.getLong("date")));

            TextView signatureText = (TextView) view.findViewById(R.id.signature_timeline);
            signatureText.setText(story.getString("signature"));

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

            TextView originalSrcView = (TextView) view.findViewById(R.id.based_on_timeline);
            String headline = "Based on \"" + story.getString("headline") + "\"";
            originalSrcView.setText(headline);

            Button viewOnline = (Button) view.findViewById(R.id.view_online_button_timeline);
            final String url = story.getString("link");
            viewOnline.setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View view) {
                    Intent browserIntent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                    view.getContext().startActivity(browserIntent);
                }
            });

        } catch (JSONException e) {
            e.printStackTrace();
        }
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