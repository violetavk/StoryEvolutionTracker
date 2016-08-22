package com.storyevolutiontracker;

import android.app.AlertDialog;
import android.content.DialogInterface;
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

public class ManageStoriesAdapter extends RecyclerView.Adapter<ManageStoriesAdapter.ViewHolder> {

    private JSONArray topics;

    public static class ViewHolder extends RecyclerView.ViewHolder {
        public View view;
        public ViewHolder(View itemView) {
            super(itemView);
            view = itemView;
        }
    }

    public ManageStoriesAdapter(JSONArray topics) {
        this.topics = topics;
    }

    @Override
    public ManageStoriesAdapter.ViewHolder onCreateViewHolder(ViewGroup parent, int viewType) {
        View v = LayoutInflater.from(parent.getContext()).inflate(R.layout.manage_story_card, parent, false);
        ViewHolder vh = new ViewHolder(v);
        return vh;
    }

    @Override
    public void onBindViewHolder(ManageStoriesAdapter.ViewHolder holder, final int position) {
        View view = holder.view;
        TextView infotext = (TextView) view.findViewById(R.id.signature_text_card);
        TextView lastUpdated = (TextView) view.findViewById(R.id.last_updated_card);
        TextView basedOnTopicWords = (TextView) view.findViewById(R.id.based_on_topic_words_textview);
        TextView originalSourceText = (TextView) view.findViewById(R.id.original_source_card);
        Button deleteButton = (Button) view.findViewById(R.id.delete_story_btn);
        try {
            JSONObject user = ValuesAndUtil.getInstance().loadUserData(view.getContext());
            if(!user.has("topics")) return;
            final JSONObject topic = user.getJSONArray("topics").getJSONObject(position);

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

            // manage delete button
            deleteButton.setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(final View view) {
                    final AlertDialog.Builder dialog = new AlertDialog.Builder(view.getContext());
                    dialog.setTitle("Delete story")
                            .setMessage("Are you sure you want to delete this story? It will no longer be tracked.")
                            .setPositiveButton("Delete", new DialogInterface.OnClickListener() {
                                @Override
                                public void onClick(DialogInterface dialogInterface, int i) {
                                    Log.d("MSA","Clicked delete on " + position);
                                    deleteSelectedStory(view, position);
                                }
                            })
                            .setNegativeButton("Cancel", new DialogInterface.OnClickListener() {
                                @Override
                                public void onClick(DialogInterface dialogInterface, int i) {
                                    Log.d("MSA","Delete dialog was closed");
                                }
                            });
                    dialog.create().show();
                }
            });
        } catch (JSONException e) {
            e.printStackTrace();
        }
    }

    public void deleteSelectedStory(View view, int position) {
        JSONObject user = ValuesAndUtil.getInstance().loadUserData(view.getContext());
        try {
            JSONArray topics = user.getJSONArray("topics");
            topics.remove(position);
            this.topics = topics;
            user.put("topics",topics);
            ValuesAndUtil.getInstance().saveUserData(user,view.getContext());
            this.notifyDataSetChanged();
        } catch (JSONException e) {
            e.printStackTrace();
        }
    }

    @Override
    public int getItemCount() {
        return topics.length();
    }
}
