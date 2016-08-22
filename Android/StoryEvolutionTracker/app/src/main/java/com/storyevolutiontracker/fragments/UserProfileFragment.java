package com.storyevolutiontracker.fragments;

import android.app.Fragment;
import android.os.Bundle;
import android.text.Spannable;
import android.text.SpannableStringBuilder;
import android.util.Log;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.TextView;

import com.storyevolutiontracker.R;
import com.storyevolutiontracker.util.RoundedBackgroundSpan;
import com.storyevolutiontracker.util.ValuesAndUtil;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

public class UserProfileFragment extends Fragment {

    @Override
    public View onCreateView(LayoutInflater inflater, ViewGroup container,
                             Bundle savedInstanceState) {
        View rootView = inflater.inflate(R.layout.fragment_user_profile, container, false);
        getActivity().setTitle("My Profile");

        JSONObject user = ValuesAndUtil.getInstance().loadUserData(getActivity().getApplicationContext());
        try {
            String userName = user.getString("username");
            TextView userNameView = (TextView) rootView.findViewById(R.id.userName_field);
            userNameView.setText(userName);

            TextView interestsView = (TextView) rootView.findViewById(R.id.user_interests_view);
            if(user.has("interests")) {
                JSONObject interests = user.getJSONObject("interests");
                JSONArray topicWords = interests.names();
                SpannableStringBuilder ssb = new SpannableStringBuilder();
                for(int i = 0; i < topicWords.length(); i++) {
                    String toAdd = " ";
                    String word = topicWords.getString(i);
                    toAdd += word;
                    int length = word.length() + 1 + 1;
                    toAdd += "    ";
                    Spannable spanText = Spannable.Factory.getInstance().newSpannable(toAdd);
                    spanText.setSpan(new RoundedBackgroundSpan(getActivity().getApplicationContext()), 0, length, Spannable.SPAN_EXCLUSIVE_EXCLUSIVE);
                    ssb.append(spanText);
                }
                interestsView.setText(ssb);
            } else {
                interestsView.setText(R.string.noInterestsFound);
            }
        } catch(JSONException e) {
            e.printStackTrace();
        }
        return rootView;
    }

    @Override
    public void onResume() {
        super.onResume();
    }
}
