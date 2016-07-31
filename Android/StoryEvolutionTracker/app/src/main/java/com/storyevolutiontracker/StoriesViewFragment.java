package com.storyevolutiontracker;

import android.app.Fragment;
import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;

/**
 * Created by violet on 31/07/2016.
 */
public class StoriesViewFragment extends Fragment {

    @Override
    public View onCreateView(LayoutInflater inflater, ViewGroup container,
                             Bundle savedInstanceState) {
        View rootView = inflater.inflate(R.layout.content_news_home_screen, container, false);
        getActivity().setTitle(getResources().getString(R.string.title_activity_news_home_screen));
        return rootView;
    }
}
