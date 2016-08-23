package com.storyevolutiontracker.fragments;

import android.app.Fragment;
import android.os.Bundle;
import android.text.method.LinkMovementMethod;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.TextView;

import com.storyevolutiontracker.R;

public class AboutFragment extends Fragment {

    @Override
    public View onCreateView(LayoutInflater inflater, ViewGroup container, Bundle savedInstanceState) {
        View rootView = inflater.inflate(R.layout.fragment_about, container, false);
        getActivity().setTitle(R.string.about_label);
        TextView thanksToGit = (TextView) rootView.findViewById(R.id.thx_to_git);
        thanksToGit.setMovementMethod(LinkMovementMethod.getInstance());
        TextView thanksForIcon = (TextView) rootView.findViewById(R.id.thx_for_icon);
        thanksForIcon.setMovementMethod(LinkMovementMethod.getInstance());
        TextView emailContact = (TextView) rootView.findViewById(R.id.email_contact);
        emailContact.setMovementMethod(LinkMovementMethod.getInstance());
        return rootView;
    }
}
