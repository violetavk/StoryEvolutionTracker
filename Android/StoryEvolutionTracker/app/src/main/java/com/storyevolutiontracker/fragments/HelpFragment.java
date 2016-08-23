package com.storyevolutiontracker.fragments;

import android.app.Fragment;
import android.os.Bundle;
import android.text.SpannableStringBuilder;
import android.text.style.ImageSpan;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.TextView;

import com.storyevolutiontracker.R;

public class HelpFragment extends Fragment {

    @Override
    public View onCreateView(LayoutInflater inflater, ViewGroup container, Bundle savedInstanceState) {
        View rootView = inflater.inflate(R.layout.fragment_help, container, false);
        getActivity().setTitle(getResources().getString(R.string.help_label));

        TextView instrTracking = (TextView) rootView.findViewById(R.id.instr_tracking);
        SpannableStringBuilder ssb1 = new SpannableStringBuilder();
        ssb1.append("Press the add new story button ")
                .append(" ", new ImageSpan(getActivity(),R.drawable.ic_add_circle_black), 0)
                .append(" button on the My Tracked Stories screen to add a new article. Then you have two options:");
        instrTracking.setText(ssb1);

        TextView option2instr = (TextView) rootView.findViewById(R.id.option2instr);
        SpannableStringBuilder ssb2 = new SpannableStringBuilder();
        ssb2.append("Open the BBC News or Sport app and open an article. Press the Share button ")
                .append(" ", new ImageSpan(getActivity(),R.drawable.ic_share), 0)
                .append(". Select the \"Copy to clipboard\" option. You can use the entire text and paste it into the text field. " +
                        "The following is also accepted as input:");
        option2instr.setText(ssb2);

        return rootView;
    }

}
