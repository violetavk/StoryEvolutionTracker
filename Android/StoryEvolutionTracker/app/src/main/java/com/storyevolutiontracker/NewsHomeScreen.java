package com.storyevolutiontracker;

import android.app.Fragment;
import android.app.FragmentManager;
import android.content.Intent;
import android.os.Bundle;
import android.support.design.widget.FloatingActionButton;
import android.support.design.widget.Snackbar;
import android.util.Log;
import android.view.View;
import android.support.design.widget.NavigationView;
import android.support.v4.view.GravityCompat;
import android.support.v4.widget.DrawerLayout;
import android.support.v7.app.ActionBarDrawerToggle;
import android.support.v7.app.AppCompatActivity;
import android.support.v7.widget.Toolbar;
import android.view.Menu;
import android.view.MenuItem;
import android.widget.TextView;

import com.storyevolutiontracker.fragments.ManageStoriesFragment;
import com.storyevolutiontracker.fragments.StoriesViewFragment;
import com.storyevolutiontracker.fragments.UserProfileFragment;
import com.storyevolutiontracker.util.UpdateNewsReceiver;
import com.storyevolutiontracker.util.ValuesAndUtil;

import org.json.JSONException;
import org.json.JSONObject;

public class NewsHomeScreen extends AppCompatActivity
        implements NavigationView.OnNavigationItemSelectedListener {

    private JSONObject user;
    private String userName;
    private DrawerLayout drawer;
    private NavigationView navigationView;
    private FloatingActionButton fab;
    private Toolbar toolbar;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        try {
            user = ValuesAndUtil.getInstance().loadUserData(getApplicationContext());
            userName = user.getString("username");
            Log.d("debug","User name found:"+userName);
        } catch (JSONException e) {
            Log.e("ERROR","NO USER FOUND IN NEWS HOME SCREEN; THIS SHOULD NEVER HAPPEN!");
            return;
        }

        // set up screen content
        setContentView(R.layout.activity_news_home_screen);
        Fragment storiesViewFragment = new StoriesViewFragment();
        FragmentManager fm = getFragmentManager();
        fm.beginTransaction().replace(R.id.content_news_home_screen,storiesViewFragment).commit();

        toolbar = (Toolbar) findViewById(R.id.toolbar);
        setSupportActionBar(toolbar);

        fab = (FloatingActionButton) findViewById(R.id.addNewTopic);
        fab.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View view) {
                Intent intent = new Intent(view.getContext(),AddNewStory.class);
                startActivity(intent);
            }
        });

        drawer = (DrawerLayout) findViewById(R.id.drawer_layout);
        ActionBarDrawerToggle toggle = new ActionBarDrawerToggle(
                this, drawer, toolbar, R.string.navigation_drawer_open, R.string.navigation_drawer_close);
        drawer.setDrawerListener(toggle);
        toggle.syncState();

        navigationView = (NavigationView) findViewById(R.id.nav_view);
        navigationView.setNavigationItemSelectedListener(this);
        navigationView.getMenu().getItem(0).setChecked(true);

        Snackbar.make(findViewById(R.id.addNewTopic), "Welcome back, " + userName + "!", Snackbar.LENGTH_LONG).show();
        View navHeaderView = navigationView.getHeaderView(0);
        TextView nameDisplay = (TextView) navHeaderView.findViewById(R.id.homeScreenNameDisplay);
        nameDisplay.setText(userName);
    }

    @Override
    public void onBackPressed() {
        DrawerLayout drawer = (DrawerLayout) findViewById(R.id.drawer_layout);
        if (drawer.isDrawerOpen(GravityCompat.START)) {
            drawer.closeDrawer(GravityCompat.START);
        } else {
            Intent intent = new Intent(Intent.ACTION_MAIN);
            intent.addCategory(Intent.CATEGORY_HOME);
            intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            startActivity(intent);
        }
    }

    @Override
    public boolean onCreateOptionsMenu(Menu menu) {
        // Inflate the menu; this adds items to the action bar if it is present.
        getMenuInflater().inflate(R.menu.news_home_screen, menu);
        return true;
    }

    @Override
    public boolean onOptionsItemSelected(MenuItem item) {
        // Handle action bar item clicks here. The action bar will
        // automatically handle clicks on the Home/Up button, so long
        // as you specify a parent activity in AndroidManifest.xml.
        int id = item.getItemId();

        //noinspection SimplifiableIfStatement
        if (id == R.id.action_settings) {
            Intent intent = new Intent(this,SettingsScreen.class);
            startActivity(intent);
        }

        return super.onOptionsItemSelected(item);
    }

    @SuppressWarnings("StatementWithEmptyBody")
    @Override
    public boolean onNavigationItemSelected(MenuItem item) {
        // Handle navigation view item clicks here.
        FragmentManager fm = getFragmentManager();

        int id = item.getItemId();
        if (id == R.id.nav_news_home) {
            // Handle going home
            Fragment sv = new StoriesViewFragment();
            fm.beginTransaction().replace(R.id.content_news_home_screen,sv).commit();
            navigationView.getMenu().getItem(0).setChecked(true);
            fab.setVisibility(View.VISIBLE);
        } else if (id == R.id.nav_manage_stories) {
            Fragment manageStories = new ManageStoriesFragment();
            fm.beginTransaction().replace(R.id.content_news_home_screen,manageStories).commit();
            navigationView.getMenu().getItem(1).setChecked(true);
            fab.setVisibility(View.INVISIBLE);
        } else if (id == R.id.nav_profile) {
            Fragment userProfile = new UserProfileFragment();
            fm.beginTransaction().replace(R.id.content_news_home_screen,userProfile).commit();
            navigationView.getMenu().getItem(2).setChecked(true);
            fab.setVisibility(View.INVISIBLE);
        } else if (id == R.id.nav_help) {
            navigationView.getMenu().getItem(3).setChecked(true);
            fab.setVisibility(View.INVISIBLE);
        } else if (id == R.id.nav_about) {
            navigationView.getMenu().getItem(4).setChecked(true);
            fab.setVisibility(View.INVISIBLE);
        }

        DrawerLayout drawer = (DrawerLayout) findViewById(R.id.drawer_layout);
        drawer.closeDrawer(GravityCompat.START);
        return true;
    }


}
