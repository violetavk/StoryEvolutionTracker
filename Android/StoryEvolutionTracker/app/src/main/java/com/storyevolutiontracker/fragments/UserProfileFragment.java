package com.storyevolutiontracker.fragments;

import android.app.Fragment;
import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;

import com.storyevolutiontracker.R;

/**
 * Created by violet on 31/07/2016.
 */
public class UserProfileFragment extends Fragment {

    public UserProfileFragment() {

    }

    @Override
    public View onCreateView(LayoutInflater inflater, ViewGroup container,
                             Bundle savedInstanceState) {
        View rootView = inflater.inflate(R.layout.fragment_user_profile, container, false);
        getActivity().setTitle("My Profile");
        return rootView;
    }
}
