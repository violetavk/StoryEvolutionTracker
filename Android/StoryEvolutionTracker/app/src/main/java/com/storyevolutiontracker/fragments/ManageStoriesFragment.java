package com.storyevolutiontracker.fragments;

import android.app.Fragment;
import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;

import com.storyevolutiontracker.R;


public class ManageStoriesFragment extends Fragment {

    @Override
    public View onCreateView(LayoutInflater inflater, ViewGroup container,
                             Bundle savedInstanceState) {

        View rootView = inflater.inflate(R.layout.fragment_manage_stories, container, false);
        getActivity().setTitle("Manage stories");
        return rootView;
    }
}
